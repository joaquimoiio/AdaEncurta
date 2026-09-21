/** Cliente HTTP fino para a API do ADA Encurta. Nada de Prisma aqui: o MCP só fala HTTP. */

export const API_URL = (process.env.ADA_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export class AdaApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }

  /** Mensagem legível para o modelo, incluindo os campos inválidos. */
  describe() {
    const detail = this.issues.map((i) => `${i.path || "corpo"}: ${i.message}`).join("; ");
    return `${this.message} (HTTP ${this.status})${detail ? ` — ${detail}` : ""}`;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

async function request(method: string, path: string, opts: { query?: Query; body?: unknown } = {}) {
  const url = new URL(`${API_URL}${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      // X-Ada-Client identifica o MCP: o servidor o recusa (403) quando MCP_ENABLED não está ativo.
      headers: { "X-Ada-Client": "mcp", ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    throw new AdaApiError(0, `Não foi possível conectar em ${API_URL}. O servidor está rodando? (${(err as Error).message})`);
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string; issues?: AdaApiError["issues"] } | null;
    throw new AdaApiError(res.status, data?.error ?? res.statusText, data?.issues ?? []);
  }
  return res;
}

export async function api<T = unknown>(method: string, path: string, opts?: { query?: Query; body?: unknown }): Promise<T> {
  return (await (await request(method, path, opts)).json()) as T;
}

export async function apiText(path: string, query?: Query): Promise<string> {
  return (await request("GET", path, { query })).text();
}

export async function apiBinary(path: string, query?: Query): Promise<{ data: Buffer; contentType: string }> {
  const res = await request("GET", path, { query });
  return { data: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
}
