import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import type { Actor } from "@/lib/audit";

export const TEST_PREFIX = "t-";
export const testActor: Actor = { label: "vitest" };

export function testCode(suffix: string) {
  return `${TEST_PREFIX}${suffix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Remove tudo que os testes criaram (links, cliques, campanhas, auditoria e cache). */
export async function cleanupTestData() {
  const links = await prisma.link.findMany({ where: { code: { startsWith: TEST_PREFIX } }, select: { id: true, code: true } });
  if (links.length) {
    await prisma.click.deleteMany({ where: { linkId: { in: links.map((l) => l.id) } } });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: links.map((l) => l.id) } } });
    await prisma.link.deleteMany({ where: { id: { in: links.map((l) => l.id) } } });
    if (redis.status === "ready") await redis.del(...links.map((l) => `link:${l.code}`)).catch(() => {});
  }
  await prisma.auditLog.deleteMany({ where: { actorLabel: testActor.label } });
  // Entradas de auditoria de entidades já removidas pelos testes (ex.: campanha excluída via API)
  await prisma.$executeRaw`DELETE FROM "audit_logs" a WHERE a."entityType" = 'Campaign' AND NOT EXISTS (SELECT 1 FROM "campaigns" c WHERE c."id" = a."entityId")`;
  await prisma.$executeRaw`DELETE FROM "audit_logs" a WHERE a."entityType" = 'Link' AND NOT EXISTS (SELECT 1 FROM "links" l WHERE l."id" = a."entityId")`;
  const campaigns = await prisma.campaign.findMany({ where: { slug: { startsWith: TEST_PREFIX } }, select: { id: true } });
  if (campaigns.length) {
    await prisma.auditLog.deleteMany({ where: { entityId: { in: campaigns.map((c) => c.id) } } });
    await prisma.campaign.deleteMany({ where: { id: { in: campaigns.map((c) => c.id) } } });
  }
}

export async function waitForRedis(timeoutMs = 3000) {
  const start = Date.now();
  while (redis.status !== "ready" && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return redis.status === "ready";
}

export function makeRequest(url: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  return new Request(url, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
}

export function routeCtx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) } as never;
}
