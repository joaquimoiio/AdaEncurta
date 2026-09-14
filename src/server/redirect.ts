import { prisma } from "@/lib/prisma";
import { normalizeCode, CODE_MAX_LENGTH } from "@/lib/short-code";
import { buildDestinationUrl, extractUtmFromSearchParams, mergeUtm, type UtmParams } from "@/lib/url";
import { parseUserAgent } from "@/lib/user-agent";
import { classifyReferer } from "@/lib/referer";
import { getClientIp, resolveGeo } from "@/lib/geo";
import { computeVisitorHash } from "@/lib/visitor-hash";
import { getCachedLink, setCachedLink, type CachedLink } from "@/server/cache";

export type ResolveResult =
  | { status: "ok"; linkId: string; code: string; destination: string; utm: UtmParams }
  | { status: "not_found" }
  | { status: "inactive" }
  | { status: "expired" };

const CODE_LOOKUP_REGEX = /^[a-z0-9_-]+$/;

/**
 * Resolve um código curto para a URL de destino.
 * Caminho rápido: Redis. Fallback: PostgreSQL (e popula o cache).
 */
export async function resolveLink(rawCode: string, requestSearchParams?: URLSearchParams): Promise<ResolveResult> {
  const code = normalizeCode(rawCode);
  if (!code || code.length > CODE_MAX_LENGTH || !CODE_LOOKUP_REGEX.test(code)) return { status: "not_found" };

  let entry = await getCachedLink(code);

  if (!entry) {
    const link = await prisma.link.findFirst({
      where: { code, deletedAt: null },
      select: {
        id: true,
        code: true,
        originalUrl: true,
        isActive: true,
        expiresAt: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmTerm: true,
        utmContent: true,
        campaign: {
          select: { isActive: true, utmSource: true, utmMedium: true, utmCampaign: true, utmTerm: true, utmContent: true },
        },
      },
    });

    if (!link) {
      entry = { notFound: true };
    } else {
      entry = {
        id: link.id,
        code: link.code,
        originalUrl: link.originalUrl,
        isActive: link.isActive,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        utm: mergeUtm(link.campaign?.isActive === false ? null : link.campaign, link),
      };
    }
    await setCachedLink(code, entry);
  }

  return evaluateEntry(entry, requestSearchParams);
}

function evaluateEntry(entry: CachedLink, requestSearchParams?: URLSearchParams): ResolveResult {
  if ("notFound" in entry) return { status: "not_found" };
  if (!entry.isActive) return { status: "inactive" };
  if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= Date.now()) return { status: "expired" };

  // UTMs passados na própria URL curta (ex.: /produto123?utm_source=qr) têm prioridade.
  const requestUtm = requestSearchParams ? extractUtmFromSearchParams(requestSearchParams) : {};
  const utm = mergeUtm(entry.utm, requestUtm);
  return { status: "ok", linkId: entry.id, code: entry.code, destination: buildDestinationUrl(entry.originalUrl, utm), utm };
}

export type ClickContext = {
  linkId: string;
  headers: Headers;
  utm: UtmParams;
  now?: Date;
};

/**
 * Registra o clique. Chamado após a resposta ser enviada (não atrasa o redirect).
 * Nunca armazena IP nem user-agent bruto.
 */
export async function recordClick(ctx: ClickContext) {
  const now = ctx.now ?? new Date();
  const userAgent = ctx.headers.get("user-agent");
  const ip = getClientIp(ctx.headers);
  const ua = parseUserAgent(userAgent);
  const referer = classifyReferer(ctx.headers.get("referer"), ctx.utm);
  const geo = await resolveGeo(ctx.headers, ip);

  await prisma.$transaction([
    prisma.click.create({
      data: {
        linkId: ctx.linkId,
        createdAt: now,
        deviceType: ua.deviceType,
        browser: ua.browser,
        browserVersion: ua.browserVersion,
        os: ua.os,
        osVersion: ua.osVersion,
        isBot: ua.isBot,
        refererHost: referer.host,
        refererSource: referer.source,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        utmSource: ctx.utm.utmSource ?? null,
        utmMedium: ctx.utm.utmMedium ?? null,
        utmCampaign: ctx.utm.utmCampaign ?? null,
        utmTerm: ctx.utm.utmTerm ?? null,
        utmContent: ctx.utm.utmContent ?? null,
        visitorHash: computeVisitorHash(ip, userAgent, now),
      },
    }),
    prisma.link.update({
      where: { id: ctx.linkId },
      data: { clickCount: { increment: 1 }, lastClickedAt: now },
    }),
  ]);
}
