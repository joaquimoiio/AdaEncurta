import { json, parseQuery, withApi } from "@/lib/api";
import { reportFilterSchema } from "@/lib/validators/report";
import { getLinkById } from "@/server/links";
import { linkStats } from "@/server/stats";

export const dynamic = "force-dynamic";

export const GET = withApi<RouteContext<"/api/links/[id]/stats">>(async (req, ctx) => {
  const { id } = await ctx.params;
  const f = parseQuery(req, reportFilterSchema);
  const link = await getLinkById(id);
  const stats = await linkStats(link.id, { from: f.from, to: f.to }, f.includeBots);
  return json({ link, ...stats });
});
