import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { LinkForm } from "@/components/links/link-form";
import { listAllCampaignsForSelect } from "@/server/campaigns";
import { getLinkById } from "@/server/links";
import { getEnv } from "@/lib/env";
import { ApiError } from "@/lib/api";

export const metadata: Metadata = { title: "Editar link" };
export const dynamic = "force-dynamic";

export default async function EditLinkPage({ params }: PageProps<"/admin/links/[id]/editar">) {
  const { id } = await params;
  const [link, campaigns] = await Promise.all([
    getLinkById(id).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }),
    listAllCampaignsForSelect(),
  ]);
  return (
    <>
      <PageHeader title="Editar link" description={link.shortUrl} />
      <LinkForm link={link} campaigns={campaigns} shortBaseUrl={getEnv().SHORT_BASE_URL} />
    </>
  );
}
