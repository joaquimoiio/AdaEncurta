import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/audit";
import { generateCode } from "@/lib/short-code";
import { buildShortUrl } from "@/lib/url";
import type { CreateLinkInput, ListLinksInput, UpdateLinkInput } from "@/lib/validators/link";
import { invalidateLinkCache } from "@/server/cache";
import type { Prisma } from "@/generated/prisma/client";

export const linkInclude = {
  campaign: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.LinkInclude;

export type LinkWithCampaign = Prisma.LinkGetPayload<{ include: typeof linkInclude }>;

export function serializeLink(link: LinkWithCampaign) {
  return {
    ...link,
    shortUrl: buildShortUrl(link.code),
    isExpired: link.expiresAt ? link.expiresAt.getTime() <= Date.now() : false,
  };
}

export type SerializedLink = ReturnType<typeof serializeLink>;

async function allocateCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode(attempt < 3 ? 7 : 9);
    const exists = await prisma.link.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  throw new ApiError(500, "Não foi possível gerar um código único. Tente novamente.");
}

async function assertCampaignExists(campaignId: string | null | undefined) {
  if (!campaignId) return;
  const c = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
  if (!c) throw new ApiError(422, "Campanha não encontrada.");
}

export async function createLink(input: CreateLinkInput, actor: Actor) {
  await assertCampaignExists(input.campaignId);

  const code = input.code ?? (await allocateCode());
  if (input.code) {
    const exists = await prisma.link.findUnique({ where: { code }, select: { id: true } });
    if (exists) throw new ApiError(409, "Este código já está em uso.");
  }

  const link = await prisma.link.create({
    data: {
      code,
      originalUrl: input.originalUrl,
      title: input.title ?? null,
      description: input.description ?? null,
      campaignId: input.campaignId ?? null,
      expiresAt: input.expiresAt ?? null,
      isActive: input.isActive ?? true,
      inactiveTitle: input.inactiveTitle ?? null,
      inactiveMessage: input.inactiveMessage ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
    },
    include: linkInclude,
  });

  await invalidateLinkCache(code);
  await audit(actor, "link.create", "Link", link.id, { code, originalUrl: link.originalUrl });
  return serializeLink(link);
}

export async function getLinkById(id: string) {
  const link = await prisma.link.findFirst({ where: { id, deletedAt: null }, include: linkInclude });
  if (!link) throw new ApiError(404, "Link não encontrado.");
  return serializeLink(link);
}

export async function updateLink(id: string, input: UpdateLinkInput, actor: Actor) {
  const current = await prisma.link.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new ApiError(404, "Link não encontrado.");

  if (input.campaignId !== undefined) await assertCampaignExists(input.campaignId);

  if (input.code && input.code !== current.code) {
    const exists = await prisma.link.findUnique({ where: { code: input.code }, select: { id: true } });
    if (exists) throw new ApiError(409, "Este código já está em uso.");
  }

  const data: Prisma.LinkUpdateInput = {};
  if (input.originalUrl !== undefined) data.originalUrl = input.originalUrl;
  if (input.code !== undefined && input.code !== null) data.code = input.code;
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.inactiveTitle !== undefined) data.inactiveTitle = input.inactiveTitle;
  if (input.inactiveMessage !== undefined) data.inactiveMessage = input.inactiveMessage;
  if (input.campaignId !== undefined) {
    data.campaign = input.campaignId ? { connect: { id: input.campaignId } } : { disconnect: true };
  }
  for (const k of ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const) {
    if (input[k] !== undefined) data[k] = input[k];
  }

  const link = await prisma.link.update({ where: { id }, data, include: linkInclude });

  await invalidateLinkCache(current.code, link.code);
  await audit(actor, "link.update", "Link", id, { changes: Object.keys(data) });
  return serializeLink(link);
}

export async function setLinkActive(id: string, isActive: boolean, actor: Actor) {
  return updateLink(id, { isActive }, actor);
}

/** Exclusão lógica: preserva histórico de cliques para relatórios. */
export async function deleteLink(id: string, actor: Actor) {
  const current = await prisma.link.findFirst({ where: { id, deletedAt: null } });
  if (!current) throw new ApiError(404, "Link não encontrado.");

  // Libera o código para reuso: renomeia com sufixo único.
  const retiredCode = `${current.code}~del~${Date.now().toString(36)}`;
  await prisma.link.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, code: retiredCode },
  });
  await invalidateLinkCache(current.code);
  await audit(actor, "link.delete", "Link", id, { code: current.code });
  return { id, deleted: true };
}

export async function listLinks(input: ListLinksInput) {
  const where: Prisma.LinkWhereInput = { deletedAt: null };
  if (input.campaignId) where.campaignId = input.campaignId;
  if (input.status === "active") where.isActive = true;
  if (input.status === "inactive") where.isActive = false;
  if (input.q) {
    where.OR = [
      { code: { contains: input.q, mode: "insensitive" } },
      { title: { contains: input.q, mode: "insensitive" } },
      { originalUrl: { contains: input.q, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.link.count({ where }),
    prisma.link.findMany({
      where,
      include: linkInclude,
      orderBy: { [input.sort]: input.order },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  return {
    items: items.map(serializeLink),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}
