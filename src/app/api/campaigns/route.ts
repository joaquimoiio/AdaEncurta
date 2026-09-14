import { json, parseBody, parseQuery, withApi } from "@/lib/api";
import { LOCAL_ACTOR } from "@/lib/audit";
import { createCampaignSchema, listCampaignsSchema } from "@/lib/validators/campaign";
import { createCampaign, listCampaigns } from "@/server/campaigns";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  return json(await listCampaigns(parseQuery(req, listCampaignsSchema)));
});

export const POST = withApi(async (req) => {
  const input = await parseBody(req, createCampaignSchema);
  return json(await createCampaign(input, LOCAL_ACTOR), { status: 201 });
});
