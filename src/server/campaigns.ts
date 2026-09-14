import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/audit";
import type { CreateCampaignInput, UpdateCampaignInput } from "@/lib/validators/campaign";
import { invalidateLinkCache } from "@/server/cache";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { listCampaignsSchema } from "@/lib/validators/campaign";

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "campanha";
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const existing = await prisma.campaign.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${i}`;
  }
  throw new ApiError(409, "Não foi possível gerar um slug único.");
}

export const campaignInclude = {
  _count: { select: { links: { where: { deletedAt: null } } } },
} satisfies Prisma.CampaignInclude;

export async function createCampaign(input: CreateCampaignInput, actor: Actor) {
  const slug = await uniqueSlug(input.slug ?? slugify(input.name));
  const campaign = await prisma.campaign.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      utmSource: input.utmSource ?? null,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? slug,
      utmTerm: input.utmTerm ?? null,
      utmContent: input.utmContent ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      isActive: input.isActive ?? true,
    },
    include: campaignInclude,
  });
  await audit(actor, "campaign.create", "Campaign", campaign.id, { slug });
  return campaign;
}

export async function updateCampaign(id: string, input: UpdateCampaignInput, actor: Actor) {
  const current = await prisma.campaign.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Campanha não encontrada.");

  const data: Prisma.CampaignUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug) data.slug = await uniqueSlug(input.slug, id);
  if (input.description !== undefined) data.description = input.description;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  for (const k of ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const) {
    if (input[k] !== undefined) data[k] = input[k];
  }

  const campaign = await prisma.campaign.update({ where: { id }, data, include: campaignInclude });

  // UTMs da campanha entram na URL final → invalida cache dos links associados.
  const links = await prisma.link.findMany({ where: { campaignId: id }, select: { code: true } });
  await invalidateLinkCache(...links.map((l) => l.code));
  await audit(actor, "campaign.update", "Campaign", id, { changes: Object.keys(data) });
  return campaign;
}

export async function deleteCampaign(id: string, actor: Actor) {
  const current = await prisma.campaign.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Campanha não encontrada.");
  const links = await prisma.link.findMany({ where: { campaignId: id }, select: { code: true } });
  await prisma.campaign.delete({ where: { id } }); // links ficam com campaignId = null (SetNull)
  await invalidateLinkCache(...links.map((l) => l.code));
  await audit(actor, "campaign.delete", "Campaign", id, { slug: current.slug });
  return { id, deleted: true };
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include: campaignInclude });
  if (!campaign) throw new ApiError(404, "Campanha não encontrada.");
  return campaign;
}

export async function listCampaigns(input: z.infer<typeof listCampaignsSchema>) {
  const where: Prisma.CampaignWhereInput = {};
  if (input.status === "active") where.isActive = true;
  if (input.status === "inactive") where.isActive = false;
  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: "insensitive" } },
      { slug: { contains: input.q, mode: "insensitive" } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.campaign.count({ where }),
    prisma.campaign.findMany({
      where,
      include: campaignInclude,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  // Total de cliques por campanha (soma dos contadores dos links)
  const ids = items.map((c) => c.id);
  const sums = ids.length
    ? await prisma.link.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: ids }, deletedAt: null },
        _sum: { clickCount: true },
      })
    : [];
  const clicksByCampaign = new Map(sums.map((s) => [s.campaignId, s._sum.clickCount ?? 0]));

  return {
    items: items.map((c) => ({ ...c, clickCount: clicksByCampaign.get(c.id) ?? 0 })),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function listAllCampaignsForSelect() {
  return prisma.campaign.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}
