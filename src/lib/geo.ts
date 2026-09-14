import { getEnv } from "@/lib/env";

export type GeoInfo = { country: string | null; region: string | null; city: string | null };

const EMPTY: GeoInfo = { country: null, region: null, city: null };

function clean(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = decodeURIComponentSafe(v).trim();
  return s ? s.slice(0, 80) : null;
}

function decodeURIComponentSafe(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function isPublicIp(ip: string): boolean {
  if (!ip) return false;
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  if (/^(fc|fd|fe80)/i.test(ip)) return false;
  return true;
}

/**
 * Resolve localização aproximada.
 * 1) Cabeçalhos de CDN/proxy (Vercel, Cloudflare), quando existirem;
 * 2) geoip-lite offline (base MaxMind GeoLite2 embutida) — o IP é usado só em memória
 *    e nunca persistido.
 */
export async function resolveGeo(headers: Headers, ip: string | null): Promise<GeoInfo> {
  const fromVercel = headers.get("x-vercel-ip-country");
  if (fromVercel) {
    return {
      country: clean(fromVercel)?.toUpperCase() ?? null,
      region: clean(headers.get("x-vercel-ip-country-region")),
      city: clean(headers.get("x-vercel-ip-city")),
    };
  }
  const fromCf = headers.get("cf-ipcountry");
  if (fromCf && fromCf !== "XX" && fromCf !== "T1") {
    return {
      country: fromCf.toUpperCase(),
      region: clean(headers.get("cf-region-code")),
      city: clean(headers.get("cf-ipcity")),
    };
  }

  if (!getEnv().GEOIP_ENABLED || !ip || !isPublicIp(ip)) return EMPTY;

  try {
    const geoip = await import("geoip-lite");
    const result = geoip.default.lookup(ip);
    if (!result) return EMPTY;
    return {
      country: result.country || null,
      region: result.region || null,
      city: result.city || null,
    };
  } catch {
    return EMPTY;
  }
}

/** Extrai o IP do cliente (usado apenas em memória para geo e rate limit). */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? null;
}
