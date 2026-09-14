import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { NewCampaignDialog } from "@/components/campaigns/campaign-dialogs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/common/pagination";
import { listCampaignsSchema } from "@/lib/validators/campaign";
import { listCampaigns } from "@/server/campaigns";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Campanhas" };
export const dynamic = "force-dynamic";

export default async function CampaignsPage({ searchParams }: PageProps<"/admin/campanhas">) {
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listCampaignsSchema.safeParse(flat);
  const input = parsed.success ? parsed.data : listCampaignsSchema.parse({});
  const result = await listCampaigns(input);

  return (
    <>
      <PageHeader title="Campanhas" description="Agrupe links por campanha e padronize os parâmetros UTM." actions={<NewCampaignDialog />} />

      {result.items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">Nenhuma campanha ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie uma campanha para organizar seus links.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((c) => (
            <Card key={c.id} className="gap-3 px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/admin/campanhas/${c.id}`} className="block truncate font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <p className="truncate font-mono text-xs text-muted-foreground">{c.slug}</p>
                </div>
                {c.isActive ? (
                  <Badge variant="outline" className="border-transparent bg-ada-orange-soft-2 text-ada-orange-dark">
                    Ativa
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inativa</Badge>
                )}
              </div>
              {c.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p> : null}
              <div className="mt-auto flex items-end justify-between text-sm">
                <div className="flex gap-4">
                  <span>
                    <span className="font-semibold tabular-nums">{formatNumber(c._count.links)}</span>{" "}
                    <span className="text-muted-foreground">links</span>
                  </span>
                  <span>
                    <span className="font-semibold tabular-nums">{formatNumber(c.clickCount)}</span>{" "}
                    <span className="text-muted-foreground">cliques</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {result.total > result.pageSize ? (
        <div className="mt-4">
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} buildHref={(p) => `/admin/campanhas?page=${p}`} />
        </div>
      ) : null}
    </>
  );
}
