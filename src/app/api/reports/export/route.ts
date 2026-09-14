import { errorResponse, enforceApiRateLimit, parseQuery } from "@/lib/api";
import { exportSchema } from "@/lib/validators/report";
import { linksSummaryCsv, streamClicksCsv } from "@/server/reports";

export const dynamic = "force-dynamic";

/** GET /api/reports/export?type=clicks|links&from=&to=&linkId=&campaignId= */
export async function GET(req: Request) {
  try {
    await enforceApiRateLimit(req);
    const q = parseQuery(req, exportSchema);
    const to = q.to ?? new Date();
    const from = q.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const filter = { from, to, linkId: q.linkId, campaignId: q.campaignId };
    const stamp = new Date().toISOString().slice(0, 10);

    if (q.type === "links") {
      const csv = await linksSummaryCsv(filter);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="links-${stamp}.csv"`,
        },
      });
    }

    return new Response(streamClicksCsv(filter), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="cliques-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
