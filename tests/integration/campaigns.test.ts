import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createCampaignRoute } from "@/app/api/campaigns/route";
import { DELETE as deleteCampaignRoute, PATCH as patchCampaignRoute } from "@/app/api/campaigns/[id]/route";
import { prisma } from "@/lib/prisma";
import { createLink } from "@/server/links";
import { slugify } from "@/server/campaigns";
import { cleanupTestData, makeRequest, routeCtx, testActor, testCode } from "./helpers";

const ORIGIN = "http://localhost:3000";

describe("Campanhas", () => {
  beforeAll(cleanupTestData);
  afterAll(cleanupTestData);

  it("gera slug a partir do nome", () => {
    expect(slugify("Lançamento Ômega-3 2026!")).toBe("lancamento-omega-3-2026");
  });

  it("cria, edita e exclui campanha mantendo os links", async () => {
    const slug = testCode("camp");
    const res = await createCampaignRoute(
      makeRequest(`${ORIGIN}/api/campaigns`, { method: "POST", body: JSON.stringify({ name: "Campanha Teste", slug, utmSource: "instagram", utmMedium: "social" }) }),
      routeCtx({}),
    );
    expect(res.status).toBe(201);
    const campaign = await res.json();
    expect(campaign.slug).toBe(slug);
    expect(campaign.utmCampaign).toBe(slug); // padrão: slug

    const link = await createLink({ originalUrl: "https://example.com/c", code: testCode("cl"), campaignId: campaign.id, isActive: true }, testActor);

    const patch = await patchCampaignRoute(
      makeRequest(`${ORIGIN}/api/campaigns/${campaign.id}`, { method: "PATCH", body: JSON.stringify({ name: "Renomeada", isActive: false }) }),
      routeCtx({ id: campaign.id }),
    );
    expect(patch.status).toBe(200);
    expect((await patch.json()).name).toBe("Renomeada");

    const del = await deleteCampaignRoute(makeRequest(`${ORIGIN}/api/campaigns/${campaign.id}`, { method: "DELETE" }), routeCtx({ id: campaign.id }));
    expect(del.status).toBe(200);

    const row = await prisma.link.findUnique({ where: { id: link.id } });
    expect(row).not.toBeNull();
    expect(row!.campaignId).toBeNull();
  });

  it("valida campos obrigatórios", async () => {
    const res = await createCampaignRoute(makeRequest(`${ORIGIN}/api/campaigns`, { method: "POST", body: JSON.stringify({ name: "x" }) }), routeCtx({}));
    expect(res.status).toBe(422);
  });
});
