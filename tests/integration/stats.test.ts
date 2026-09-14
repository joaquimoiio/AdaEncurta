import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as statsRoute } from "@/app/api/links/[id]/stats/route";
import { GET as dashboardRoute } from "@/app/api/dashboard/route";
import { GET as exportRoute } from "@/app/api/reports/export/route";
import { createLink } from "@/server/links";
import { recordClick } from "@/server/redirect";
import { clicksSeries, countClicks, linkStats } from "@/server/stats";
import { cleanupTestData, makeRequest, routeCtx, testActor, testCode } from "./helpers";

const ORIGIN = "http://localhost:3000";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

describe("Visualizar estatísticas", () => {
  let linkId: string;
  let code: string;

  beforeAll(async () => {
    await cleanupTestData();
    code = testCode("stats");
    const link = await createLink({ originalUrl: "https://example.com/stats", code, title: "Stats", isActive: true }, testActor);
    linkId = link.id;
    const h = (ua: string, extra: Record<string, string> = {}) => new Headers({ "user-agent": ua, ...extra });
    const now = new Date();
    await recordClick({ linkId, headers: h(IPHONE, { referer: "https://www.instagram.com/" }), utm: {}, now });
    await recordClick({ linkId, headers: h(IPHONE, { referer: "https://www.instagram.com/" }), utm: {}, now });
    await recordClick({ linkId, headers: h(CHROME, { referer: "https://www.google.com/" }), utm: { utmSource: "google", utmMedium: "cpc" }, now });
    await recordClick({ linkId, headers: h("curl/8"), utm: {}, now }); // bot
    await recordClick({ linkId, headers: h(CHROME), utm: {}, now: new Date(now.getTime() - 3 * 864e5) });
  });
  afterAll(cleanupTestData);

  it("calcula totais, série temporal e distribuições ignorando bots por padrão", async () => {
    const period = { from: new Date(Date.now() - 7 * 864e5), to: new Date() };
    const s = await linkStats(linkId, period);
    expect(s.totals.clicksInPeriod).toBe(4);
    expect(s.totals.clicksToday).toBe(3);
    expect(s.totals.visitorsInPeriod).toBeGreaterThanOrEqual(2);
    expect(s.series.reduce((a, p) => a + p.clicks, 0)).toBe(4);
    expect(s.devices.find((d) => d.label === "MOBILE")?.value).toBe(2);
    expect(s.devices.find((d) => d.label === "DESKTOP")?.value).toBe(2);
    expect(s.devices.find((d) => d.label === "BOT")).toBeUndefined();
    expect(s.sources.find((d) => d.label === "SOCIAL")?.value).toBe(2);
    expect(s.sources.find((d) => d.label === "PAID")?.value).toBe(1);
    expect(s.refererHosts.find((d) => d.label === "instagram.com")?.value).toBe(2);
    expect(s.utmSources.find((d) => d.label === "google")?.value).toBe(1);
    expect(s.recent).toHaveLength(4);

    const withBots = await countClicks({ ...period, linkId, includeBots: true });
    expect(withBots.clicks).toBe(5);
  });

  it("preenche buckets vazios na série", async () => {
    const period = { from: new Date(Date.now() - 4 * 864e5), to: new Date() };
    const series = await clicksSeries({ ...period, linkId }, "day");
    expect(series.length).toBeGreaterThanOrEqual(4);
    expect(series.some((p) => p.clicks === 0)).toBe(true);
  });

  it("expõe estatísticas do link e do dashboard via API", async () => {
    const res = await statsRoute(makeRequest(`${ORIGIN}/api/links/${linkId}/stats`), routeCtx({ id: linkId }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.link.code).toBe(code);
    expect(body.totals.clicksInPeriod).toBe(4);

    const dash = await dashboardRoute(makeRequest(`${ORIGIN}/api/dashboard`), routeCtx({}));
    expect(dash.status).toBe(200);
    const d = await dash.json();
    expect(d.totals.links).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(d.series)).toBe(true);
    expect(d.topLinks.some((l: { id: string }) => l.id === linkId)).toBe(true);
  });

  it("exporta CSV de cliques e resumo por link", async () => {
    const res = await exportRoute(makeRequest(`${ORIGIN}/api/reports/export?type=clicks&linkId=${linkId}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    const lines = csv.trim().split(/\r?\n/);
    expect(lines[0]).toContain("data_hora,codigo,titulo,url_curta");
    expect(lines).toHaveLength(1 + 5);
    expect(csv).toContain("instagram.com");

    const summary = await exportRoute(makeRequest(`${ORIGIN}/api/reports/export?type=links&linkId=${linkId}`));
    const text = await summary.text();
    expect(text).toContain(code);
    expect(text.split(/\r?\n/)[1]).toContain(",4,5"); // cliques_periodo (sem bots), cliques_total
  });

  it("a exclusão do link mantém os cliques para relatórios (soft delete)", async () => {
    const before = await prisma.click.count({ where: { linkId } });
    expect(before).toBe(5);
  });
});
