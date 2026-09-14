import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { LinkForm } from "@/components/links/link-form";
import { listAllCampaignsForSelect } from "@/server/campaigns";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Novo link" };
export const dynamic = "force-dynamic";

export default async function NewLinkPage() {
  const campaigns = await listAllCampaignsForSelect();
  return (
    <>
      <PageHeader title="Novo link" description="Crie uma URL curta e comece a rastrear os acessos." />
      <LinkForm campaigns={campaigns} shortBaseUrl={getEnv().SHORT_BASE_URL} />
    </>
  );
}
