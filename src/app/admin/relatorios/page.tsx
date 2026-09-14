import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodFilter } from "@/components/common/period-filter";
import { ReportFilters } from "@/components/reports/report-filters";
import { ExportButtons } from "@/components/reports/export-buttons";
import { StatCard } from "@/components/stats/stat-card";
import { BreakdownList } from "@/components/stats/breakdown-list";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { DEVICE_LABELS, SOURCE_LABELS, formatNumber } from "@/lib/format";
import { parsePeriod } from "@/lib/period";
import { listAllCampaignsForSelect } from "@/server/campaigns";
import {
  breakdownBrowsers,
  breakdownCountries,
  breakdownDevices,
  breakdownOs,
  breakdownSources,
  breakdownUtmCampaigns,
  breakdownUtmMediums,
  breakdownUtmSources,
  clicksSeries,
  countClicks,
  pickGranularity,
  topLinks,
} from "@/server/stats";

export const metadata: Metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: PageProps<"/admin/relatorios">) {
  const sp = await searchParams;
  const period = parsePeriod({ periodo: str(sp.periodo), de: str(sp.de), ate: str(sp.ate) });
  const campaignId = str(sp.campaignId) || undefined;
  const linkId = str(sp.linkId) || undefined;
  const includeBots = str(sp.bots) === "1";
  const f = { ...period, campaignId, linkId, includeBots };

  const [campaigns, linkOptions, totals, series, top, devices, browsers, os, sources, countries, utmS, utmM, utmC] = await Promise.all([
    listAllCampaignsForSelect(),
    prisma.link.findMany({
      where: { deletedAt: null, ...(campaignId ? { campaignId } : {}) },
      select: { id: true, code: true, title: true },
      orderBy: { clickCount: "desc" },
      take: 200,
    }),
    countClicks(f),
    clicksSeries(f),
    topLinks(f, 15),
    breakdownDevices(f),
    breakdownBrowsers(f),
    breakdownOs(f),
    breakdownSources(f),
    breakdownCountries(f),
    breakdownUtmSources(f),
    breakdownUtmMediums(f),
    breakdownUtmCampaigns(f),
  ]);

  const exportQuery = new URLSearchParams({
    from: period.from.toISOString(),
    to: period.to.toISOString(),
    ...(campaignId ? { campaignId } : {}),
    ...(linkId ? { linkId } : {}),
  }).toString();

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Filtre por período, campanha e link. Exporte os dados em CSV."
        actions={<PeriodFilter preset={period.preset} from={period.from.toISOString()} to={period.to.toISOString()} />}
      />

      <Card className="mb-4">
        <CardContent className="space-y-4">
          <ReportFilters campaigns={campaigns} links={linkOptions.map((l) => ({ id: l.id, name: l.title ? `${l.title} (${l.code})` : l.code }))} />
          <ExportButtons query={exportQuery} />
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Cliques no período" value={totals.clicks} accent="green" />
        <StatCard label="Visitantes únicos" value={totals.visitors} />
        <StatCard label="Links com cliques" value={top.length} accent="neutral" />
        <StatCard label="Média por dia" value={Math.round(totals.clicks / Math.max(1, (period.to.getTime() - period.from.getTime()) / 864e5))} accent="neutral" />
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Cliques por período</CardTitle>
        </CardHeader>
        <CardContent>
          <ClicksChart data={series} granularity={pickGranularity(period)} height={260} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Links mais acessados</CardTitle>
          <CardDescription>Top 15 no período com os filtros aplicados.</CardDescription>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum clique com os filtros aplicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>URL original</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top.map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Link href={`/admin/links/${l.id}`} className="font-medium hover:underline">
                          {l.title || l.code}
                        </Link>
                        <p className="font-mono text-xs text-muted-foreground">{l.shortUrl.replace(/^https?:\/\//, "")}</p>
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate text-sm text-muted-foreground">{l.originalUrl}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatNumber(l.clicks)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{totals.clicks ? Math.round((l.clicks / totals.clicks) * 100) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BreakdownList title="Dispositivos" items={devices} labels={DEVICE_LABELS} />
        <BreakdownList title="Navegadores" items={browsers} />
        <BreakdownList title="Sistemas operacionais" items={os} color="var(--chart-5)" />
        <BreakdownList title="Origem" items={sources} labels={SOURCE_LABELS} color="var(--chart-2)" />
        <BreakdownList title="Países" items={countries} />
        <BreakdownList title="utm_source" items={utmS} color="var(--chart-3)" />
        <BreakdownList title="utm_medium" items={utmM} color="var(--chart-3)" />
        <BreakdownList title="utm_campaign" items={utmC} color="var(--chart-3)" />
      </section>
    </>
  );
}

function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
