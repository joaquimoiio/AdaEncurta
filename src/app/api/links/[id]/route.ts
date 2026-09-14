import { json, parseBody, withApi } from "@/lib/api";
import { LOCAL_ACTOR } from "@/lib/audit";
import { updateLinkSchema } from "@/lib/validators/link";
import { deleteLink, getLinkById, updateLink } from "@/server/links";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/links/[id]">;

export const GET = withApi<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await getLinkById(id));
});

export const PATCH = withApi<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const input = await parseBody(req, updateLinkSchema);
  return json(await updateLink(id, input, LOCAL_ACTOR));
});

export const DELETE = withApi<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return json(await deleteLink(id, LOCAL_ACTOR));
});
