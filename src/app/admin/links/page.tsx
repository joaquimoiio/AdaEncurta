import Link from "next/link";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { LinksTable } from "@/components/links/links-table";
import { LinksFilters } from "@/components/links/links-filters";
import { Pagination } from "@/components/common/pagination";
import { listLinksSchema } from "@/lib/validators/link";
import { listLinks } from "@/server/links";
import { listAllCampaignsForSelect } from "@/server/campaigns";

export const metadata: Metadata = { title: "Links" };
export const dynamic = "force-dynamic";

export default async function LinksPage({ searchParams }: PageProps<"/admin/links">) {
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listLinksSchema.safeParse(flat);
  const input = parsed.success ? parsed.data : listLinksSchema.parse({});
  const [result, campaigns] = await Promise.all([listLinks(input), listAllCampaignsForSelect()]);

  const buildHref = (page: number) => {
    const q = new URLSearchParams(flat as Record<string, string>);
    q.set("page", String(page));
    return `/admin/links?${q.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Links"
        description={`${result.total} link${result.total === 1 ? "" : "s"} cadastrado${result.total === 1 ? "" : "s"}.`}
        actions={
          <Button asChild>
            <Link href="/admin/links/novo">
              <Plus data-icon="inline-start" />
              Novo link
            </Link>
          </Button>
        }
      />
      <div className="space-y-4">
        <LinksFilters campaigns={campaigns} />
        <LinksTable links={result.items} />
        {result.total > 0 ? (
          <Pagination page={result.page} totalPages={result.totalPages} total={result.total} pageSize={result.pageSize} buildHref={buildHref} />
        ) : null}
      </div>
    </>
  );
}
