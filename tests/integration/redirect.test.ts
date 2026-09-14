import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// `after()` do Next exige contexto de request; nos testes executamos o callback imediatamente.
const scheduled: Promise<unknown>[] = [];
vi.mock("next/server", async (importOriginal) => {
  const mod = await importOriginal<typeof import("next/server")>();
  return {
    ...mod,
    after: (fn: () => Promise<unknown> | unknown) => {
      scheduled.push(Promise.resolve().then(fn));
    },
  };
});

import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { GET as redirectRoute } from "@/app/[code]/route";
import { createLink, updateLink } from "@/server/links";
import { createCampaign } from "@/server/campaigns";
import { resolveLink } from "@/server/redirect";
import { cleanupTestData, routeCtx, testActor, testCode, waitForRedis } from "./helpers";

const ORIGIN = "http://localhost:3000";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

async function flushScheduled() {
  await Promise.all(scheduled.splice(0));
}

function hit(code: string, headers: Record<string, string> = {}, query = "") {
  return redirectRoute(new Request(`${ORIGIN}/${code}${query}`, { headers }), routeCtx({ code }));
}

describe("Acessar URL curta → redirecionar e registrar clique", () => {
  beforeAll(async () => {
    await cleanupTestData();
    await waitForRedis();
  });
  afterAll(cleanupTestData);

  it("redireciona (302) para a URL original e registra o clique com dados do dispositivo/origem", async () => {
    const code = testCode("redir");
    const link = await createLink({ originalUrl: "https://adanutraceuticos.com.br/products/omega-3", code, isActive: true }, testActor);

    const res = await hit(code, {
      "user-agent": IPHONE,
      referer: "https://www.instagram.com/adanutraceuticos/",
      "x-forwarded-for": "177.33.10.10",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://adanutraceuticos.com.br/products/omega-3");
    expect(res.headers.get("cache-control")).toContain("no-store");

    await flushScheduled();

    const click = await prisma.click.findFirst({ where: { linkId: link.id }, orderBy: { id: "desc" } });
    expect(click).not.toBeNull();
    expect(click!.deviceType).toBe("MOBILE");
    expect(click!.os).toBe("iOS");
    expect(click!.browser).toMatch(/Safari/);
    expect(click!.refererSource).toBe("SOCIAL");
    expect(click!.refererHost).toBe("instagram.com");
    expect(click!.country).toBe("BR");
    expect(click!.isBot).toBe(false);
    expect(click!.visitorHash).toHaveLength(32);

    const updated = await prisma.link.findUnique({ where: { id: link.id } });
    expect(updated!.clickCount).toBe(1);
    expect(updated!.lastClickedAt).not.toBeNull();
  });

  it("não armazena IP nem user-agent bruto (LGPD)", async () => {
    const code = testCode("lgpd");
    const link = await createLink({ originalUrl: "https://example.com/lgpd", code, isActive: true }, testActor);
    await hit(code, { "user-agent": IPHONE, "x-forwarded-for": "8.8.8.8" });
    await flushScheduled();
    const click = await prisma.click.findFirst({ where: { linkId: link.id } });
    const json = JSON.stringify(click, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    expect(json).not.toContain("8.8.8.8");
    expect(json).not.toContain("AppleWebKit");
  });

  it("é case-insensitive e aplica UTMs da campanha, do link e da requisição (nesta ordem de prioridade)", async () => {
    const campaign = await createCampaign(
      { name: "Teste", slug: testCode("camp"), utmSource: "newsletter", utmMedium: "email", utmCampaign: "set-2026", isActive: true },
      testActor,
    );
    const code = testCode("utm");
    await createLink({ originalUrl: "https://example.com/p?x=1", code, campaignId: campaign.id, utmMedium: "link-medium", isActive: true }, testActor);

    const res = await hit(code.toUpperCase(), {}, "?utm_campaign=req-campaign");
    expect(res.status).toBe(302);
    const dest = new URL(res.headers.get("location")!);
    expect(dest.searchParams.get("x")).toBe("1");
    expect(dest.searchParams.get("utm_source")).toBe("newsletter"); // campanha
    expect(dest.searchParams.get("utm_medium")).toBe("link-medium"); // link sobrescreve campanha
    expect(dest.searchParams.get("utm_campaign")).toBe("req-campaign"); // requisição sobrescreve tudo
    await flushScheduled();
  });

  it("usa o cache do Redis no segundo acesso e invalida ao editar", async () => {
    if (redis.status !== "ready") return; // ambiente sem Redis: pula
    const code = testCode("cache");
    const link = await createLink({ originalUrl: "https://example.com/v1", code, isActive: true }, testActor);

    expect(await redis.get(`link:${code}`)).toBeNull();
    await hit(code);
    const cached = await redis.get(`link:${code}`);
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!).originalUrl).toBe("https://example.com/v1");

    // com cache quente, resolve sem tocar no banco
    const spy = vi.spyOn(prisma.link, "findFirst");
    const r = await resolveLink(code);
    expect(r.status).toBe("ok");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();

    await updateLink(link.id, { originalUrl: "https://example.com/v2" }, testActor);
    expect(await redis.get(`link:${code}`)).toBeNull();
    const res = await hit(code);
    expect(res.headers.get("location")).toBe("https://example.com/v2");
    await flushScheduled();
  });

  it("link inexistente, inativo ou expirado leva à página de indisponível sem registrar clique", async () => {
    const missing = await hit(testCode("missing"));
    expect(missing.status).toBe(302);
    expect(missing.headers.get("location")).toContain("/link-indisponivel?motivo=not_found");

    const inactive = testCode("inactive");
    const l1 = await createLink({ originalUrl: "https://example.com/i", code: inactive, isActive: false }, testActor);
    const r1 = await hit(inactive);
    expect(r1.headers.get("location")).toContain("motivo=inactive");

    const expired = testCode("expired");
    const l2 = await createLink({ originalUrl: "https://example.com/e", code: expired, isActive: true, expiresAt: new Date(Date.now() - 1000) }, testActor);
    const r2 = await hit(expired);
    expect(r2.headers.get("location")).toContain("motivo=expired");

    await flushScheduled();
    expect(await prisma.click.count({ where: { linkId: { in: [l1.id, l2.id] } } })).toBe(0);
  });

  it("aplica rate limit por IP no redirect", async () => {
    const code = testCode("rl");
    await createLink({ originalUrl: "https://example.com/rl", code, isActive: true }, testActor);
    const ip = `203.0.113.${Math.floor(Math.random() * 250)}`;
    const limit = Number(process.env.RATE_LIMIT_REDIRECT_PER_MINUTE ?? 120);
    let blocked = 0;
    for (let i = 0; i < limit + 5; i++) {
      const res = await hit(code, { "x-forwarded-for": ip, "user-agent": "curl/8" });
      if (res.status === 429) blocked++;
    }
    expect(blocked).toBeGreaterThanOrEqual(5);
    await flushScheduled();
  });
});
