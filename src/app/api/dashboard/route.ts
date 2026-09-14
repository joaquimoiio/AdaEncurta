import { json, parseQuery, withApi } from "@/lib/api";
import { reportFilterSchema } from "@/lib/validators/report";
import { dashboardStats } from "@/server/stats";

export const dynamic = "force-dynamic";

export const GET = withApi(async (req) => {
  const f = parseQuery(req, reportFilterSchema);
  return json(await dashboardStats({ from: f.from, to: f.to }, { campaignId: f.campaignId, includeBots: f.includeBots }));
});
