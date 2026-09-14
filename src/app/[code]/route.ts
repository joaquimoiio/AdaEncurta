import { NextResponse, after } from "next/server";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/geo";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { recordClick, resolveLink } from "@/server/redirect";

export const dynamic = "force-dynamic";

/**
 * Rota pública do link curto: GET /{code}
 * 1) rate limit por IP;
 * 2) resolve via Redis (fallback Postgres);
 * 3) responde 302 imediatamente;
 * 4) registra o clique depois da resposta (`after`), sem atrasar o usuário.
 */
export async function GET(req: Request, ctx: RouteContext<"/[code]">) {
  const { code } = await ctx.params;
  const headers = new Headers(req.headers);
  const ip = getClientIp(headers) ?? "local";

  const limit = await rateLimit("redirect", ip, getEnv().RATE_LIMIT_REDIRECT_PER_MINUTE);
  if (!limit.allowed) {
    return new NextResponse("Muitas requisições. Tente novamente em instantes.", {
      status: 429,
      headers: rateLimitHeaders(limit),
    });
  }

  const url = new URL(req.url);
  const result = await resolveLink(code, url.searchParams);

  if (result.status !== "ok") {
    const reason = result.status;
    return NextResponse.redirect(new URL(`/link-indisponivel?motivo=${reason}`, getEnv().APP_URL), {
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  after(async () => {
    try {
      await recordClick({ linkId: result.linkId, headers, utm: result.utm });
    } catch (err) {
      console.error("[redirect] falha ao registrar clique:", err);
    }
  });

  return NextResponse.redirect(result.destination, {
    status: 302,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer-when-downgrade",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function HEAD(req: Request, ctx: RouteContext<"/[code]">) {
  const { code } = await ctx.params;
  const result = await resolveLink(code);
  if (result.status !== "ok") return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 302, headers: { Location: result.destination } });
}
