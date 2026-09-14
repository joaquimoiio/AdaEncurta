import { getAllowedDestinationHosts, getEnv } from "@/lib/env";

export const MAX_URL_LENGTH = 2048;

export type UrlValidation = { ok: true; url: string } | { ok: false; reason: string };

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fc/i,
  /^\[?fd/i,
  /^\[?fe80/i,
];

function hostMatches(host: string, pattern: string): boolean {
  if (pattern.startsWith("*.")) {
    const base = pattern.slice(2);
    return host === base || host.endsWith(`.${base}`);
  }
  return host === pattern;
}

/**
 * Valida a URL de destino de um link:
 *  - apenas http/https;
 *  - sem credenciais embutidas;
 *  - sem hosts privados/loopback (evita uso do encurtador para alcançar rede interna);
 *  - não pode apontar para o próprio encurtador (evita loops);
 *  - opcionalmente restrita a uma lista de domínios (ALLOWED_DESTINATION_HOSTS).
 */
export function validateDestinationUrl(raw: string): UrlValidation {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "Informe a URL de destino." };
  if (value.length > MAX_URL_LENGTH) return { ok: false, reason: `A URL deve ter no máximo ${MAX_URL_LENGTH} caracteres.` };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "URL inválida. Inclua o protocolo (https://)." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Apenas URLs http ou https são permitidas." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URLs com credenciais embutidas não são permitidas." };
  }
  const host = url.hostname.toLowerCase();
  if (!host || !host.includes(".") && host !== "localhost") {
    return { ok: false, reason: "O domínio da URL parece inválido." };
  }
  if (PRIVATE_HOST_PATTERNS.some((p) => p.test(host))) {
    return { ok: false, reason: "Endereços locais ou de rede interna não são permitidos." };
  }

  const shortHost = new URL(getEnv().SHORT_BASE_URL).hostname.toLowerCase();
  if (host === shortHost && shortHost !== "localhost") {
    return { ok: false, reason: "A URL de destino não pode apontar para o próprio encurtador." };
  }

  const allowed = getAllowedDestinationHosts();
  if (allowed.length > 0 && !allowed.some((p) => hostMatches(host, p))) {
    return { ok: false, reason: `Domínio não permitido. Permitidos: ${allowed.join(", ")}.` };
  }

  return { ok: true, url: url.toString() };
}

export type UtmParams = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
};

const UTM_KEYS: Array<[keyof UtmParams, string]> = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"],
  ["utmContent", "utm_content"],
];

/**
 * Monta a URL final de redirecionamento aplicando UTMs (sem sobrescrever
 * parâmetros já presentes na URL original).
 */
export function buildDestinationUrl(originalUrl: string, utm: UtmParams): string {
  const url = new URL(originalUrl);
  let changed = false;
  for (const [key, param] of UTM_KEYS) {
    const value = utm[key];
    if (value && !url.searchParams.has(param)) {
      url.searchParams.set(param, value);
      changed = true;
    }
  }
  return changed ? url.toString() : originalUrl;
}

/** Combina UTMs: link > campanha. */
export function mergeUtm(...layers: Array<UtmParams | null | undefined>): UtmParams {
  const result: UtmParams = {};
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key] of UTM_KEYS) {
      if (layer[key]) result[key] = layer[key];
    }
  }
  return result;
}

/** Extrai UTMs de uma query string (ex.: do acesso à URL curta). */
export function extractUtmFromSearchParams(params: URLSearchParams): UtmParams {
  const result: UtmParams = {};
  for (const [key, param] of UTM_KEYS) {
    const v = params.get(param)?.trim();
    if (v) result[key] = v.slice(0, 200);
  }
  return result;
}

export function buildShortUrl(code: string): string {
  const base = getEnv().SHORT_BASE_URL.replace(/\/+$/, "");
  return `${base}/${code}`;
}
