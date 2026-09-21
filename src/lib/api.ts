import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getClientIp } from "@/lib/geo";
import { getEnv } from "@/lib/env";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Dados inválidos.",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  console.error("[api] erro inesperado:", err);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Corpo da requisição inválido (JSON esperado).");
  }
  return schema.parse(body);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  return schema.parse(params);
}

/** Cabeçalho que o servidor MCP envia em toda requisição (ver mcp/client.ts). */
export const MCP_CLIENT_HEADER = "x-ada-client";

/** Recusa (403) requisições do MCP quando MCP_ENABLED não está ativo. */
export function assertMcpAllowed(req: Request) {
  if (req.headers.get(MCP_CLIENT_HEADER) === "mcp" && !getEnv().MCP_ENABLED) {
    throw new ApiError(403, "O MCP está desativado neste servidor. Ative com MCP_ENABLED=true no .env do app.");
  }
}

/** Aplica o bloqueio do MCP e o rate limit por IP nos endpoints administrativos. Lança ApiError 403/429. */
export async function enforceApiRateLimit(req: Request) {
  assertMcpAllowed(req);
  const ip = getClientIp(new Headers(req.headers)) ?? "local";
  const result = await rateLimit("api", ip, getEnv().RATE_LIMIT_API_PER_MINUTE);
  if (!result.allowed) {
    throw new ApiError(429, "Muitas requisições. Tente novamente em instantes.", rateLimitHeaders(result));
  }
}

/** Envolve um handler com tratamento de erro e rate limit padrão. */
export function withApi<Ctx>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      await enforceApiRateLimit(req);
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
