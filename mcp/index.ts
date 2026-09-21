#!/usr/bin/env tsx
/**
 * MCP do ADA Encurta — campanhas, links (com UTMs), relatórios e QR Code.
 * Fala exclusivamente com a API HTTP do app (ADA_API_URL, padrão http://localhost:3000).
 *
 * Transporte: stdio. Logs vão para stderr (stdout é o canal do protocolo).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { normalizeUtm } from "./utm";
import { AdaApiError, API_URL, api, apiBinary, apiText } from "./client";

const server = new McpServer({ name: "ada-encurta", version: "0.1.0" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UTM_KEYS = ["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"] as const;

function normalizeUtmFields<T extends Partial<Record<(typeof UTM_KEYS)[number], string | null>>>(input: T): T {
  const out = { ...input };
  for (const k of UTM_KEYS) {
    if (k in out) (out as Record<string, unknown>)[k] = normalizeUtm(out[k]) || null;
  }
  return out;
}

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown): CallToolResult {
  const message = err instanceof AdaApiError ? err.describe() : err instanceof Error ? err.message : String(err);
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** Executa o handler convertendo qualquer erro em resultado `isError` (o modelo consegue reagir). */
function safe<A>(handler: (args: A) => Promise<CallToolResult>) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return await handler(args);
    } catch (err) {
      return fail(err);
    }
  };
}

const isoDate = z.string().describe("Data/hora ISO 8601 (ex.: 2026-09-01 ou 2026-09-01T00:00:00Z).");
const utmField = (name: string, example: string) => z.string().max(200).nullable().optional().describe(`${name}. Ex.: ${example}. Normalizado para minúsculas/hífens.`);

const period = {
  from: isoDate.optional().describe("Início do período (padrão: 30 dias atrás)."),
  to: isoDate.optional().describe("Fim do período (padrão: agora)."),
  includeBots: z.boolean().optional().describe("Incluir cliques de bots (padrão: não)."),
};

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

// ---------------------------------------------------------------------------
// Campanhas
// ---------------------------------------------------------------------------

server.registerTool(
  "list_campaigns",
  {
    title: "Listar campanhas",
    description: "Lista campanhas com UTMs, quantidade de links e total de cliques. Use para descobrir o id de uma campanha.",
    inputSchema: {
      q: z.string().optional().describe("Busca por nome ou slug."),
      status: z.enum(["all", "active", "inactive"]).optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(100).optional(),
    },
    annotations: READ,
  },
  safe(async (args) => ok(await api("GET", "/api/campaigns", { query: args }))),
);

server.registerTool(
  "get_campaign",
  { title: "Detalhar campanha", description: "Retorna uma campanha pelo id.", inputSchema: { id: z.string() }, annotations: READ },
  safe(async ({ id }) => ok(await api("GET", `/api/campaigns/${encodeURIComponent(id)}`))),
);

const campaignFields = {
  description: z.string().max(500).nullable().optional(),
  utmSource: utmField("utm_source padrão da campanha", "instagram"),
  utmMedium: utmField("utm_medium padrão da campanha", "social"),
  utmCampaign: utmField("utm_campaign (padrão: slug da campanha)", "lancamento-creatina"),
  utmTerm: utmField("utm_term", "creatina"),
  utmContent: utmField("utm_content", "banner-topo"),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  isActive: z.boolean().optional(),
};

server.registerTool(
  "create_campaign",
  {
    title: "Criar campanha",
    description:
      "Cria uma campanha. Os UTMs definidos aqui são herdados por todos os links da campanha (o link pode sobrescrever). " +
      "Se utmCampaign não for informado, usa o slug.",
    inputSchema: {
      name: z.string().min(2).max(120),
      slug: z.string().max(80).nullable().optional().describe("Opcional; gerado a partir do nome."),
      ...campaignFields,
    },
    annotations: WRITE,
  },
  safe(async (args) => ok(await api("POST", "/api/campaigns", { body: normalizeUtmFields(args) }))),
);

server.registerTool(
  "update_campaign",
  {
    title: "Atualizar campanha",
    description: "Atualiza campos de uma campanha (só os enviados). Mudar UTMs reflete imediatamente nos links associados.",
    inputSchema: { id: z.string(), name: z.string().min(2).max(120).optional(), slug: z.string().max(80).optional(), ...campaignFields },
    annotations: { ...WRITE, idempotentHint: true },
  },
  safe(async ({ id, ...body }) => ok(await api("PATCH", `/api/campaigns/${encodeURIComponent(id)}`, { body: normalizeUtmFields(body) }))),
);

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

server.registerTool(
  "list_links",
  {
    title: "Listar links",
    description: "Lista links com URL curta, UTMs, campanha e contagem de cliques.",
    inputSchema: {
      q: z.string().optional().describe("Busca por código, título ou URL."),
      campaignId: z.string().optional(),
      status: z.enum(["all", "active", "inactive"]).optional(),
      sort: z.enum(["createdAt", "clickCount", "title"]).optional(),
      order: z.enum(["asc", "desc"]).optional(),
      page: z.number().int().min(1).optional(),
      pageSize: z.number().int().min(1).max(100).optional(),
    },
    annotations: READ,
  },
  safe(async (args) => ok(await api("GET", "/api/links", { query: args }))),
);

server.registerTool(
  "get_link",
  { title: "Detalhar link", description: "Retorna um link pelo id.", inputSchema: { id: z.string() }, annotations: READ },
  safe(async ({ id }) => ok(await api("GET", `/api/links/${encodeURIComponent(id)}`))),
);

const linkFields = {
  title: z.string().max(160).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  campaignId: z.string().nullable().optional().describe("Id da campanha. Os UTMs da campanha são herdados."),
  expiresAt: isoDate.nullable().optional().describe("Quando o link deixa de redirecionar."),
  utmSource: utmField("utm_source (sobrescreve o da campanha)", "instagram"),
  utmMedium: utmField("utm_medium (sobrescreve o da campanha)", "social"),
  utmCampaign: utmField("utm_campaign (sobrescreve o da campanha)", "lancamento-creatina"),
  utmTerm: utmField("utm_term", "creatina"),
  utmContent: utmField("utm_content", "story-1"),
};

server.registerTool(
  "create_link",
  {
    title: "Criar link curto",
    description:
      "Cria um link curto para uma URL de destino. Se campaignId for informado, os UTMs da campanha são aplicados no redirecionamento; " +
      "utm* passados aqui sobrescrevem os da campanha. Retorna shortUrl.",
    inputSchema: {
      originalUrl: z.string().describe("URL de destino (http/https)."),
      code: z.string().max(64).nullable().optional().describe("Código personalizado; gerado automaticamente se omitido."),
      ...linkFields,
    },
    annotations: WRITE,
  },
  safe(async (args) => ok(await api("POST", "/api/links", { body: normalizeUtmFields(args) }))),
);

server.registerTool(
  "create_links_for_channels",
  {
    title: "Criar links por canal",
    description:
      "Cria um link para cada canal (Instagram, e-mail, WhatsApp...) apontando para a mesma URL, cada um com seu utm_source/medium/content. " +
      "Ideal para distribuir uma campanha em vários canais e comparar depois no relatório. Máx. 20 canais.",
    inputSchema: {
      originalUrl: z.string(),
      campaignId: z.string().optional(),
      channels: z
        .array(
          z.object({
            utmSource: z.string().describe("Ex.: instagram, email, whatsapp."),
            utmMedium: z.string().optional().describe("Ex.: social, email, cpc."),
            utmContent: z.string().optional(),
            utmTerm: z.string().optional(),
            title: z.string().max(160).optional(),
            code: z.string().max(64).optional(),
          }),
        )
        .min(1)
        .max(20),
    },
    annotations: WRITE,
  },
  safe(async ({ originalUrl, campaignId, channels }) => {
    const created: unknown[] = [];
    const failed: { utmSource: string; error: string }[] = [];
    // Sequencial: respeita o rate limit da API e mantém a ordem.
    for (const ch of channels) {
      try {
        created.push(await api("POST", "/api/links", { body: normalizeUtmFields({ originalUrl, campaignId, ...ch }) }));
      } catch (err) {
        failed.push({ utmSource: ch.utmSource, error: err instanceof AdaApiError ? err.describe() : String(err) });
      }
    }
    const result = ok({ created, failed });
    return failed.length && !created.length ? { ...result, isError: true } : result;
  }),
);

server.registerTool(
  "update_link",
  {
    title: "Atualizar link",
    description: "Atualiza campos de um link (só os enviados): destino, UTMs, campanha, expiração, código.",
    inputSchema: { id: z.string(), originalUrl: z.string().optional(), code: z.string().max(64).optional(), ...linkFields },
    annotations: { ...WRITE, idempotentHint: true },
  },
  safe(async ({ id, ...body }) => ok(await api("PATCH", `/api/links/${encodeURIComponent(id)}`, { body: normalizeUtmFields(body) }))),
);

server.registerTool(
  "deactivate_link",
  {
    title: "Desativar link",
    description:
      "Desativa um link (para de redirecionar). Título e mensagem personalizados são exibidos ao visitante; " +
      "se omitidos, aparece o texto padrão 'Link desativado'.",
    inputSchema: {
      id: z.string(),
      inactiveTitle: z.string().max(120).nullable().optional().describe("Título da página exibida. Ex.: Promoção encerrada."),
      inactiveMessage: z.string().max(500).nullable().optional().describe("Mensagem exibida. Ex.: Confira as novidades no site."),
    },
    annotations: { ...WRITE, idempotentHint: true },
  },
  safe(async ({ id, ...msg }) => ok(await api("PATCH", `/api/links/${encodeURIComponent(id)}`, { body: { isActive: false, ...msg } }))),
);

server.registerTool(
  "activate_link",
  { title: "Reativar link", description: "Reativa um link desativado.", inputSchema: { id: z.string() }, annotations: { ...WRITE, idempotentHint: true } },
  safe(async ({ id }) => ok(await api("PATCH", `/api/links/${encodeURIComponent(id)}`, { body: { isActive: true } }))),
);

server.registerTool(
  "get_link_qrcode",
  {
    title: "QR Code do link",
    description: "Gera o QR Code (PNG) da URL curta. Com utm=true, marca os cliques como origem 'qr' nos relatórios.",
    inputSchema: { id: z.string(), size: z.number().int().min(128).max(2048).optional(), utm: z.boolean().optional() },
    annotations: READ,
  },
  safe(async ({ id, size, utm }) => {
    const { data, contentType } = await apiBinary(`/api/links/${encodeURIComponent(id)}/qrcode`, { format: "png", size: size ?? 512, utm });
    return { content: [{ type: "image", data: data.toString("base64"), mimeType: contentType }] };
  }),
);

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

server.registerTool(
  "get_link_stats",
  {
    title: "Relatório do link",
    description: "Cliques, visitantes únicos, série temporal e quebras por dispositivo, origem, país e UTM para um link.",
    inputSchema: { id: z.string(), ...period },
    annotations: READ,
  },
  safe(async ({ id, ...q }) => ok(await api("GET", `/api/links/${encodeURIComponent(id)}/stats`, { query: q }))),
);

server.registerTool(
  "get_campaign_report",
  {
    title: "Relatório da campanha",
    description: "Métricas agregadas de todos os links de uma campanha: totais, série, top links, origens, dispositivos e UTMs.",
    inputSchema: { campaignId: z.string(), ...period },
    annotations: READ,
  },
  safe(async (q) => ok(await api("GET", "/api/dashboard", { query: q }))),
);

server.registerTool(
  "get_dashboard",
  {
    title: "Painel geral",
    description: "Visão geral de todos os links no período: totais, série temporal, top links e quebras.",
    inputSchema: { ...period },
    annotations: READ,
  },
  safe(async (q) => ok(await api("GET", "/api/dashboard", { query: q }))),
);

server.registerTool(
  "export_report",
  {
    title: "Exportar relatório (CSV)",
    description:
      "Exporta CSV: type='links' (resumo por link) ou 'clicks' (um registro por clique, pode ser grande — limite o período). " +
      "Retorna o CSV como texto, cortado em maxRows linhas.",
    inputSchema: {
      type: z.enum(["links", "clicks"]).optional(),
      from: isoDate.optional(),
      to: isoDate.optional(),
      linkId: z.string().optional(),
      campaignId: z.string().optional(),
      maxRows: z.number().int().min(1).max(5000).optional().describe("Padrão: 500."),
    },
    annotations: READ,
  },
  safe(async ({ maxRows, type, ...q }) => {
    const csv = await apiText("/api/reports/export", { type: type ?? "links", ...q });
    const limit = maxRows ?? 500;
    const lines = csv.split("\n");
    const truncated = lines.length - 1 > limit;
    return ok(lines.slice(0, limit + 1).join("\n") + (truncated ? `\n# cortado em ${limit} linhas` : ""));
  }),
);

// ---------------------------------------------------------------------------

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(`[ada-encurta-mcp] pronto — API: ${API_URL}`);
}

main().catch((err) => {
  console.error("[ada-encurta-mcp] falha ao iniciar:", err);
  process.exit(1);
});
