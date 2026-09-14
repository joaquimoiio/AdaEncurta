import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { buildShortUrl } from "@/lib/url";

export type Period = { from: Date; to: Date };
export type Granularity = "hour" | "day" | "week" | "month";

export type SeriesPoint = { bucket: string; clicks: number; visitors: number };
export type Breakdown = { label: string; value: number }[];

export type StatsFilter = Period & { linkId?: string; campaignId?: string; includeBots?: boolean };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

/** Escolhe a granularidade do gráfico com base no tamanho do período. */
export function pickGranularity(period: Period): Granularity {
  const hours = (period.to.getTime() - period.from.getTime()) / 36e5;
  if (hours <= 48) return "hour";
  if (hours <= 24 * 92) return "day";
  if (hours <= 24 * 400) return "week";
  return "month";
}

function whereSql(f: StatsFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`c."createdAt" >= ${f.from}`,
    Prisma.sql`c."createdAt" <= ${f.to}`,
  ];
  if (f.linkId) parts.push(Prisma.sql`c."linkId" = ${f.linkId}`);
  if (f.campaignId) parts.push(Prisma.sql`l."campaignId" = ${f.campaignId}`);
  if (!f.includeBots) parts.push(Prisma.sql`c."isBot" = false`);
  return Prisma.join(parts, " AND ");
}

const FROM = Prisma.sql`FROM "clicks" c JOIN "links" l ON l."id" = c."linkId"`;

export async function clicksSeries(f: StatsFilter, granularity: Granularity = pickGranularity(f)): Promise<SeriesPoint[]> {
  const rows = await prisma.$queryRaw<{ bucket: Date; clicks: bigint; visitors: bigint }[]>`
    SELECT date_trunc(${granularity}, c."createdAt") AS bucket,
           COUNT(*)::bigint AS clicks,
           COUNT(DISTINCT c."visitorHash")::bigint AS visitors
    ${FROM}
    WHERE ${whereSql(f)}
    GROUP BY 1 ORDER BY 1`;

  return fillSeries(rows.map((r) => ({ bucket: r.bucket.toISOString(), clicks: Number(r.clicks), visitors: Number(r.visitors) })), f, granularity);
}

/** Preenche buckets vazios com zero para o gráfico ficar contínuo. */
function fillSeries(points: SeriesPoint[], period: Period, granularity: Granularity): SeriesPoint[] {
  const map = new Map(points.map((p) => [p.bucket, p]));
  const out: SeriesPoint[] = [];
  const cursor = truncate(period.from, granularity);
  const end = period.to.getTime();
  let guard = 0;
  while (cursor.getTime() <= end && guard++ < 2000) {
    const key = cursor.toISOString();
    out.push(map.get(key) ?? { bucket: key, clicks: 0, visitors: 0 });
    advance(cursor, granularity);
  }
  return out;
}

function truncate(date: Date, g: Granularity): Date {
  const d = new Date(date);
  if (g === "hour") d.setUTCMinutes(0, 0, 0);
  if (g === "day") d.setUTCHours(0, 0, 0, 0);
  if (g === "week") {
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay() || 7; // Postgres: semana começa na segunda
    d.setUTCDate(d.getUTCDate() - day + 1);
  }
  if (g === "month") {
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(1);
  }
  return d;
}

function advance(d: Date, g: Granularity) {
  if (g === "hour") d.setUTCHours(d.getUTCHours() + 1);
  if (g === "day") d.setUTCDate(d.getUTCDate() + 1);
  if (g === "week") d.setUTCDate(d.getUTCDate() + 7);
  if (g === "month") d.setUTCMonth(d.getUTCMonth() + 1);
}

async function breakdown(f: StatsFilter, column: Prisma.Sql, limit = 10): Promise<Breakdown> {
  const rows = await prisma.$queryRaw<{ label: string | null; value: bigint }[]>`
    SELECT ${column} AS label, COUNT(*)::bigint AS value
    ${FROM}
    WHERE ${whereSql(f)}
    GROUP BY 1 ORDER BY 2 DESC LIMIT ${limit}`;
  return rows.map((r) => ({ label: r.label ?? "Desconhecido", value: Number(r.value) }));
}

export const breakdownDevices = (f: StatsFilter) => breakdown(f, Prisma.sql`c."deviceType"::text`);
export const breakdownBrowsers = (f: StatsFilter) => breakdown(f, Prisma.sql`c."browser"`);
export const breakdownOs = (f: StatsFilter) => breakdown(f, Prisma.sql`c."os"`);
export const breakdownSources = (f: StatsFilter) => breakdown(f, Prisma.sql`c."refererSource"::text`);
export const breakdownRefererHosts = (f: StatsFilter) => breakdown(f, Prisma.sql`c."refererHost"`);
export const breakdownCountries = (f: StatsFilter) => breakdown(f, Prisma.sql`c."country"`);
export const breakdownUtmSources = (f: StatsFilter) => breakdown(f, Prisma.sql`c."utmSource"`);
export const breakdownUtmMediums = (f: StatsFilter) => breakdown(f, Prisma.sql`c."utmMedium"`);
export const breakdownUtmCampaigns = (f: StatsFilter) => breakdown(f, Prisma.sql`c."utmCampaign"`);

export async function breakdownLocations(f: StatsFilter, limit = 10) {
  const rows = await prisma.$queryRaw<{ country: string | null; region: string | null; city: string | null; value: bigint }[]>`
    SELECT c."country", c."region", c."city", COUNT(*)::bigint AS value
    ${FROM}
    WHERE ${whereSql(f)}
    GROUP BY 1, 2, 3 ORDER BY 4 DESC LIMIT ${limit}`;
  return rows.map((r) => ({
    country: r.country,
    region: r.region,
    city: r.city,
    label: [r.city, r.region, r.country].filter(Boolean).join(", ") || "Desconhecido",
    value: Number(r.value),
  }));
}

export async function countClicks(f: StatsFilter): Promise<{ clicks: number; visitors: number }> {
  const rows = await prisma.$queryRaw<{ clicks: bigint; visitors: bigint }[]>`
    SELECT COUNT(*)::bigint AS clicks, COUNT(DISTINCT c."visitorHash")::bigint AS visitors
    ${FROM}
    WHERE ${whereSql(f)}`;
  return { clicks: Number(rows[0]?.clicks ?? 0), visitors: Number(rows[0]?.visitors ?? 0) };
}

export async function topLinks(f: StatsFilter, limit = 10) {
  const rows = await prisma.$queryRaw<{ id: string; code: string; title: string | null; originalUrl: string; value: bigint }[]>`
    SELECT l."id", l."code", l."title", l."originalUrl", COUNT(*)::bigint AS value
    ${FROM}
    WHERE ${whereSql(f)} AND l."deletedAt" IS NULL
    GROUP BY 1, 2, 3, 4 ORDER BY 5 DESC LIMIT ${limit}`;
  return rows.map(({ value, ...r }) => ({ ...r, clicks: Number(value), shortUrl: buildShortUrl(r.code) }));
}

export async function dashboardStats(period: Period, options: { campaignId?: string; includeBots?: boolean } = {}) {
  const base = { ...period, ...options };
  const linkWhere = { deletedAt: null as null, ...(options.campaignId ? { campaignId: options.campaignId } : {}) };

  const [
    totalLinks,
    activeLinks,
    totalCampaigns,
    allTime,
    today,
    last7,
    last30,
    inPeriod,
    series,
    top,
    devices,
    browsers,
    os,
    sources,
    refererHosts,
    countries,
    locations,
  ] = await Promise.all([
    prisma.link.count({ where: linkWhere }),
    prisma.link.count({ where: { ...linkWhere, isActive: true } }),
    prisma.campaign.count(),
    countClicks({ from: new Date(0), to: new Date(), ...options }),
    countClicks({ from: startOfToday(), to: new Date(), ...options }),
    countClicks({ from: daysAgo(7), to: new Date(), ...options }),
    countClicks({ from: daysAgo(30), to: new Date(), ...options }),
    countClicks(base),
    clicksSeries(base),
    topLinks(base),
    breakdownDevices(base),
    breakdownBrowsers(base),
    breakdownOs(base),
    breakdownSources(base),
    breakdownRefererHosts(base),
    breakdownCountries(base),
    breakdownLocations(base),
  ]);

  return {
    period: { from: period.from.toISOString(), to: period.to.toISOString(), granularity: pickGranularity(period) },
    totals: {
      links: totalLinks,
      activeLinks,
      campaigns: totalCampaigns,
      clicksAllTime: allTime.clicks,
      clicksToday: today.clicks,
      clicksLast7: last7.clicks,
      clicksLast30: last30.clicks,
      clicksInPeriod: inPeriod.clicks,
      visitorsInPeriod: inPeriod.visitors,
    },
    series,
    topLinks: top,
    devices,
    browsers,
    os,
    sources,
    refererHosts,
    countries,
    locations,
  };
}

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;

export async function linkStats(linkId: string, period: Period, includeBots = false) {
  const f: StatsFilter = { ...period, linkId, includeBots };
  const [inPeriod, today, last7, last30, series, devices, browsers, os, sources, refererHosts, countries, locations, utmSources, utmMediums, utmCampaigns, recent] =
    await Promise.all([
      countClicks(f),
      countClicks({ from: startOfToday(), to: new Date(), linkId, includeBots }),
      countClicks({ from: daysAgo(7), to: new Date(), linkId, includeBots }),
      countClicks({ from: daysAgo(30), to: new Date(), linkId, includeBots }),
      clicksSeries(f),
      breakdownDevices(f),
      breakdownBrowsers(f),
      breakdownOs(f),
      breakdownSources(f),
      breakdownRefererHosts(f),
      breakdownCountries(f),
      breakdownLocations(f),
      breakdownUtmSources(f),
      breakdownUtmMediums(f),
      breakdownUtmCampaigns(f),
      prisma.click.findMany({
        where: { linkId, createdAt: { gte: period.from, lte: period.to }, ...(includeBots ? {} : { isBot: false }) },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          createdAt: true,
          deviceType: true,
          browser: true,
          os: true,
          refererHost: true,
          refererSource: true,
          country: true,
          region: true,
          city: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      }),
    ]);

  return {
    period: { from: period.from.toISOString(), to: period.to.toISOString(), granularity: pickGranularity(period) },
    totals: {
      clicksInPeriod: inPeriod.clicks,
      visitorsInPeriod: inPeriod.visitors,
      clicksToday: today.clicks,
      clicksLast7: last7.clicks,
      clicksLast30: last30.clicks,
    },
    series,
    devices,
    browsers,
    os,
    sources,
    refererHosts,
    countries,
    locations,
    utmSources,
    utmMediums,
    utmCampaigns,
    recent: recent.map((c) => ({ ...c, id: c.id.toString(), createdAt: c.createdAt.toISOString() })),
  };
}

export type LinkStats = Awaited<ReturnType<typeof linkStats>>;
