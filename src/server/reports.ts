import { prisma } from "@/lib/prisma";
import { buildShortUrl } from "@/lib/url";
import type { Prisma } from "@/generated/prisma/client";

export type ExportFilter = { from: Date; to: Date; linkId?: string; campaignId?: string };

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  // Evita injeção de fórmulas em planilhas (=, +, -, @)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsvLine(values: unknown[]): string {
  return values.map(csvEscape).join(",") + "\r\n";
}

const BOM = "﻿";

/**
 * Exporta cliques em CSV como stream (cursor por id) para não carregar tudo em memória.
 */
export function streamClicksCsv(f: ExportFilter): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const where: Prisma.ClickWhereInput = {
    createdAt: { gte: f.from, lte: f.to },
    ...(f.linkId ? { linkId: f.linkId } : {}),
    ...(f.campaignId ? { link: { campaignId: f.campaignId } } : {}),
  };

  let cursor: bigint | undefined;
  let headerSent = false;
  const header = [
    "data_hora",
    "codigo",
    "titulo",
    "url_curta",
    "url_original",
    "campanha",
    "dispositivo",
    "navegador",
    "versao_navegador",
    "sistema",
    "versao_sistema",
    "bot",
    "origem",
    "referer_host",
    "pais",
    "estado",
    "cidade",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headerSent) {
        controller.enqueue(encoder.encode(BOM + toCsvLine(header)));
        headerSent = true;
      }
      const rows = await prisma.click.findMany({
        where,
        orderBy: { id: "asc" },
        take: 1000,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { link: { select: { code: true, title: true, originalUrl: true, campaign: { select: { name: true } } } } },
      });
      if (rows.length === 0) {
        controller.close();
        return;
      }
      let chunk = "";
      for (const c of rows) {
        chunk += toCsvLine([
          c.createdAt,
          c.link.code,
          c.link.title,
          buildShortUrl(c.link.code),
          c.link.originalUrl,
          c.link.campaign?.name,
          c.deviceType,
          c.browser,
          c.browserVersion,
          c.os,
          c.osVersion,
          c.isBot ? "sim" : "nao",
          c.refererSource,
          c.refererHost,
          c.country,
          c.region,
          c.city,
          c.utmSource,
          c.utmMedium,
          c.utmCampaign,
          c.utmTerm,
          c.utmContent,
        ]);
      }
      controller.enqueue(encoder.encode(chunk));
      cursor = rows[rows.length - 1].id;
    },
  });
}

/** Exporta o resumo por link (cliques no período) em CSV. */
export async function linksSummaryCsv(f: ExportFilter): Promise<string> {
  const links = await prisma.link.findMany({
    where: { deletedAt: null, ...(f.campaignId ? { campaignId: f.campaignId } : {}), ...(f.linkId ? { id: f.linkId } : {}) },
    include: { campaign: { select: { name: true } } },
    orderBy: { clickCount: "desc" },
  });
  const counts = await prisma.click.groupBy({
    by: ["linkId"],
    where: { createdAt: { gte: f.from, lte: f.to }, isBot: false, linkId: { in: links.map((l) => l.id) } },
    _count: { _all: true },
  });
  const byLink = new Map(counts.map((c) => [c.linkId, c._count._all]));

  let out = BOM + toCsvLine(["codigo", "titulo", "url_curta", "url_original", "campanha", "ativo", "criado_em", "cliques_periodo", "cliques_total"]);
  for (const l of links) {
    out += toCsvLine([
      l.code,
      l.title,
      buildShortUrl(l.code),
      l.originalUrl,
      l.campaign?.name,
      l.isActive ? "sim" : "nao",
      l.createdAt,
      byLink.get(l.id) ?? 0,
      l.clickCount,
    ]);
  }
  return out;
}
