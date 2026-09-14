import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, Link2, MousePointerClick, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PeriodFilter } from "@/components/common/period-filter";
import { StatCard } from "@/components/stats/stat-card";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { LinksTable } from "@/components/links/links-table";
import { DeleteCampaignButton, EditCampaignDialog } from "@/components/campaigns/campaign-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { DEVICE_LABELS, SOURCE_LABELS, formatDate, formatNumber } from "@/lib/format";
import { parsePeriod } from "@/lib/period";
import { getCampaignById } from "@/server/campaigns";
import { listLinks } from "@/server/links";
import { dashboardStats } from "@/server/stats";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/campanhas/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await getCampaignById(id).catch(() => null);
  return { title: c ? c.name : "Campanha" };
}

export default async function CampaignDetailPage({ params, searchParams }: PageProps<"/admin/campanhas/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const campaign = await getCampaignById(id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const period = parsePeriod({ periodo: str(sp.periodo), de: str(sp.de), ate: str(sp.ate) });
  const [stats, links] = await Promise.all([
    dashboardStats(period, { campaignId: id }),
    listLinks({ campaignId: id, page: 1, pageSize: 100, status: "all", sort: "clickCount", order: "desc" }),
  ]);

  const utms = [
    ["utm_source", campaign.utmSource],
    ["utm_medium", campaign.utmMedium],
    ["utm_campaign", campaign.utmCampaign],
    ["utm_term", campaign.utmTerm],
    ["utm_content", campaign.utmContent],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <Link href="/admin/campanhas" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Campanhas
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {campaign.name}
            {campaign.isActive ? (
              <Badge variant="outline" className="border-transparent bg-ada-orange-soft-2 text-ada-orange-dark">
                Ativa
              </Badge>
            ) : (
              <Badge variant="secondary">Inativa</Badge>
            )}
          </span>
        }
        description={
          <span className="flex flex-wrap gap-x-3">
            <span className="font-mono">{campaign.slug}</span>
            {campaign.startsAt || campaign.endsAt ? (
              <span>
                {campaign.startsAt ? formatDate(campaign.startsAt) : "…"} – {campaign.endsAt ? formatDate(campaign.endsAt) : "…"}
              </span>
            ) : null}
            {campaign.description ? <span>{campaign.description}</span> : null}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/reports/export?type=clicks&campaignId=${campaign.id}&from=${stats.period.from}&to=${stats.period.to}`}>
                <Download data-icon="inline-start" />
                CSV
              </a>
            </Button>
            <EditCampaignDialog campaign={campaign} />
            <DeleteCampaignButton id={campaign.id} name={campaign.name} linkCount={campaign._count.links} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {utms.length ? (
            utms.map(([k, v]) => (
              <Badge key={k} variant="outline" className="font-mono text-[11px]">
                {k}={v}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Sem UTMs padrão.</span>
          )}
        </div>
        <PeriodFilter preset={period.preset} from={stats.period.from} to={stats.period.to} />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Links" value={stats.totals.links} hint={`${formatNumber(stats.totals.activeLinks)} ativos`} icon={Link2} />
        <StatCard label="Cliques (total)" value={stats.totals.clicksAllTime} icon={MousePointerClick} accent="green" />
        <StatCard label="Cliques no período" value={stats.totals.clicksInPeriod} hint={`${formatNumber(stats.totals.visitorsInPeriod)} visitantes únicos`} icon={Users} />
        <StatCard label="Últimos 7 dias" value={stats.totals.clicksLast7} hint={`${formatNumber(stats.totals.clicksToday)} hoje`} accent="neutral" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cliques por período</CardTitle>
          </CardHeader>
          <CardContent>
            <ClicksChart data={stats.series} granularity={stats.period.granularity} height={240} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={stats.devices} labels={DEVICE_LABELS} height={120} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={stats.sources} labels={SOURCE_LABELS} height={120} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Links da campanha</h2>
            <CardDescription>{links.total} link(s).</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={`/admin/links/novo?campaignId=${campaign.id}`}>
              <Plus data-icon="inline-start" />
              Novo link
            </Link>
          </Button>
        </div>
        <LinksTable links={links.items} />
      </section>
    </>
  );
}

function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
