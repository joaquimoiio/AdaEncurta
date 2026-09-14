import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, Download, ExternalLink, MousePointerClick, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodFilter } from "@/components/common/period-filter";
import { CopyButton } from "@/components/common/copy-button";
import { StatCard } from "@/components/stats/stat-card";
import { BreakdownList } from "@/components/stats/breakdown-list";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarBreakdown } from "@/components/charts/bar-breakdown";
import { LinkActions } from "@/components/links/link-actions";
import { StatusBadge } from "@/components/links/links-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { DEVICE_LABELS, SOURCE_LABELS, formatDateTime, formatNumber } from "@/lib/format";
import { parsePeriod } from "@/lib/period";
import { buildDestinationUrl, mergeUtm } from "@/lib/url";
import { getLinkById } from "@/server/links";
import { linkStats } from "@/server/stats";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/links/[id]">): Promise<Metadata> {
  const { id } = await params;
  const link = await getLinkById(id).catch(() => null);
  return { title: link ? `${link.title || link.code}` : "Link" };
}

export default async function LinkDetailPage({ params, searchParams }: PageProps<"/admin/links/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const link = await getLinkById(id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const period = parsePeriod({ periodo: str(sp.periodo), de: str(sp.de), ate: str(sp.ate) });
  const [stats, campaign] = await Promise.all([
    linkStats(link.id, period),
    link.campaignId ? prisma.campaign.findUnique({ where: { id: link.campaignId } }) : null,
  ]);
  const finalUrl = buildDestinationUrl(link.originalUrl, mergeUtm(campaign?.isActive === false ? null : campaign, link));
  const utmEntries = [
    ["utm_source", link.utmSource],
    ["utm_medium", link.utmMedium],
    ["utm_campaign", link.utmCampaign],
    ["utm_term", link.utmTerm],
    ["utm_content", link.utmContent],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <Link href="/admin/links" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Links
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {link.title || link.code}
            <StatusBadge link={link} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 font-mono text-primary">
              {link.shortUrl}
              <CopyButton value={link.shortUrl} size="icon-xs" />
            </span>
            <a href={link.originalUrl} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 truncate hover:text-foreground">
              <span className="truncate">{link.originalUrl}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/reports/export?type=clicks&linkId=${link.id}&from=${stats.period.from}&to=${stats.period.to}`}>
                <Download data-icon="inline-start" />
                CSV
              </a>
            </Button>
            <LinkActions link={link} compact={false} afterDelete="list" />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {campaign ? (
            <span>
              Campanha:{" "}
              <Link href={`/admin/campanhas/${campaign.id}`} className="font-medium text-foreground hover:underline">
                {campaign.name}
              </Link>
            </span>
          ) : null}
          {link.expiresAt ? <span>Expira em {formatDateTime(link.expiresAt)}</span> : null}
          <span>Criado em {formatDateTime(link.createdAt)}</span>
        </div>
        <PeriodFilter preset={period.preset} from={stats.period.from} to={stats.period.to} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Cliques (total)" value={link.clickCount} hint={link.lastClickedAt ? `último em ${formatDateTime(link.lastClickedAt)}` : "nenhum clique ainda"} icon={MousePointerClick} accent="green" />
        <StatCard label="Cliques no período" value={stats.totals.clicksInPeriod} hint={`${formatNumber(stats.totals.visitorsInPeriod)} visitantes únicos`} icon={Users} />
        <StatCard label="Hoje" value={stats.totals.clicksToday} hint={`${formatNumber(stats.totals.clicksLast7)} nos últimos 7 dias`} icon={CalendarDays} />
        <StatCard label="Últimos 30 dias" value={stats.totals.clicksLast30} icon={CalendarDays} accent="neutral" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cliques por período</CardTitle>
          </CardHeader>
          <CardContent>
            <ClicksChart data={stats.series} granularity={stats.period.granularity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Redirecionamento</CardTitle>
            <CardDescription>URL final entregue ao visitante.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="break-all rounded-lg bg-muted p-3 font-mono text-xs">{finalUrl}</p>
            {utmEntries.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {utmEntries.map(([k, v]) => (
                  <Badge key={k} variant="outline" className="font-mono text-[11px]">
                    {k}={v}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem UTMs no link{campaign ? " (herda os da campanha)" : ""}.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={stats.devices} labels={DEVICE_LABELS} height={160} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Navegadores</CardTitle>
          </CardHeader>
          <CardContent>
            <BarBreakdown data={stats.browsers} height={180} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sistemas operacionais</CardTitle>
          </CardHeader>
          <CardContent>
            <BarBreakdown data={stats.os} height={180} color="var(--chart-5)" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Origem dos acessos</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={stats.sources} labels={SOURCE_LABELS} height={160} />
          </CardContent>
        </Card>
        <BreakdownList title="Sites de origem" items={stats.refererHosts} color="var(--chart-2)" />
        <BreakdownList title="Localização" items={stats.locations} />
        <BreakdownList title="utm_source" items={stats.utmSources} color="var(--chart-3)" />
        <BreakdownList title="utm_medium" items={stats.utmMediums} color="var(--chart-3)" />
        <BreakdownList title="utm_campaign" items={stats.utmCampaigns} color="var(--chart-3)" />
      </section>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Últimos cliques</CardTitle>
          <CardDescription>Os 25 acessos mais recentes no período. Nenhum dado pessoal identificável é armazenado.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum clique no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data e hora</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Navegador</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>UTM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(c.createdAt)}</TableCell>
                      <TableCell>{DEVICE_LABELS[c.deviceType] ?? c.deviceType}</TableCell>
                      <TableCell>{c.browser ?? "—"}</TableCell>
                      <TableCell>{c.os ?? "—"}</TableCell>
                      <TableCell>
                        {SOURCE_LABELS[c.refererSource] ?? c.refererSource}
                        {c.refererHost ? <span className="block text-xs text-muted-foreground">{c.refererHost}</span> : null}
                      </TableCell>
                      <TableCell>{[c.city, c.region, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                        {[c.utmSource, c.utmMedium, c.utmCampaign].filter(Boolean).join(" / ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
