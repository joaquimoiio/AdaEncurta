import Link from "next/link";
import { ArrowRight, Link2, MousePointerClick, CalendarDays, Users } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodFilter } from "@/components/common/period-filter";
import { StatCard } from "@/components/stats/stat-card";
import { BreakdownList } from "@/components/stats/breakdown-list";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarBreakdown } from "@/components/charts/bar-breakdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common/copy-button";
import { dashboardStats } from "@/server/stats";
import { parsePeriod } from "@/lib/period";
import { DEVICE_LABELS, SOURCE_LABELS, formatNumber, truncateMiddle } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const period = parsePeriod({ periodo: str(sp.periodo), de: str(sp.de), ate: str(sp.ate) });
  const stats = await dashboardStats(period);
  const t = stats.totals;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos links curtos e dos acessos."
        actions={<PeriodFilter preset={period.preset} from={stats.period.from} to={stats.period.to} />}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total de links" value={t.links} hint={`${formatNumber(t.activeLinks)} ativos`} icon={Link2} />
        <StatCard label="Total de cliques" value={t.clicksAllTime} hint="desde o início" icon={MousePointerClick} accent="green" />
        <StatCard label="Cliques hoje" value={t.clicksToday} hint={`${formatNumber(t.clicksLast7)} nos últimos 7 dias`} icon={CalendarDays} />
        <StatCard label="Últimos 30 dias" value={t.clicksLast30} hint={`${formatNumber(t.visitorsInPeriod)} visitantes únicos no período`} icon={Users} accent="neutral" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cliques por período</CardTitle>
            <CardDescription>
              {formatNumber(t.clicksInPeriod)} cliques e {formatNumber(t.visitorsInPeriod)} visitantes únicos no período selecionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClicksChart data={stats.series} granularity={stats.period.granularity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links mais acessados</CardTitle>
            <CardDescription>No período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum clique no período.</p>
            ) : (
              <ol className="space-y-3">
                {stats.topLinks.slice(0, 6).map((l, i) => (
                  <li key={l.id} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/links/${l.id}`} className="block truncate text-sm font-medium hover:underline">
                        {l.title || l.code}
                      </Link>
                      <p className="truncate font-mono text-xs text-muted-foreground">{truncateMiddle(l.shortUrl.replace(/^https?:\/\//, ""), 36)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatNumber(l.clicks)}</span>
                    <CopyButton value={l.shortUrl} />
                  </li>
                ))}
              </ol>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-4 w-full">
              <Link href="/admin/links?sort=clickCount">
                Ver todos os links
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
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
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Origem dos acessos</CardTitle>
            <CardDescription>Classificação por referer e UTM.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart data={stats.sources} labels={SOURCE_LABELS} height={160} />
          </CardContent>
        </Card>
        <BreakdownList title="Sites de origem" description="Domínio do referer." items={stats.refererHosts} color="var(--chart-2)" />
        <BreakdownList title="Localização" description="País, estado e cidade (aproximados)." items={stats.locations} />
      </section>
    </>
  );
}

function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
