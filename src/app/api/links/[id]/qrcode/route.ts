import { z } from "zod";
import { errorResponse, parseQuery } from "@/lib/api";
import { getLinkById } from "@/server/links";
import { generateQrCode } from "@/server/qrcode";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  format: z.enum(["png", "svg"]).default("png"),
  size: z.coerce.number().int().min(128).max(2048).default(512),
  download: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
  utm: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

/** GET /api/links/:id/qrcode?format=png|svg&size=512&download=1&utm=1 */
export async function GET(req: Request, ctx: RouteContext<"/api/links/[id]/qrcode">) {
  try {
    const { id } = await ctx.params;
    const q = parseQuery(req, querySchema);
    const link = await getLinkById(id);
    // utm=1 marca a origem como QR nos relatórios
    const target = q.utm ? `${link.shortUrl}?utm_medium=qr` : link.shortUrl;
    const { body, contentType } = await generateQrCode(target, q.format, q.size);
    const filename = `qrcode-${link.code}.${q.format}`;
    return new Response(body as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        ...(q.download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
