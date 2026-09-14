import { json, parseBody, withApi } from "@/lib/api";
import { LOCAL_ACTOR } from "@/lib/audit";
import { updateCampaignSchema } from "@/lib/validators/campaign";
import { deleteCampaign, getCampaignById, updateCampaign } from "@/server/campaigns";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/campaigns/[id]">;

export const GET = withApi<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await getCampaignById(id));
});

export const PATCH = withApi<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  return json(await updateCampaign(id, await parseBody(req, updateCampaignSchema), LOCAL_ACTOR));
});

export const DELETE = withApi<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await deleteCampaign(id, LOCAL_ACTOR));
});
