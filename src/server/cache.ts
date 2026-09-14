import { getEnv } from "@/lib/env";
import { safeRedis } from "@/lib/redis";
import type { UtmParams } from "@/lib/url";

/**
 * Entrada de cache do redirect. Contém tudo o que o redirect precisa para
 * responder sem tocar no banco.
 */
export type CachedLink = {
  id: string;
  code: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  utm: UtmParams;
} | { notFound: true };

const KEY_PREFIX = "link:";
const NOT_FOUND_TTL = 60;

export function linkCacheKey(code: string) {
  return `${KEY_PREFIX}${code}`;
}

export async function getCachedLink(code: string): Promise<CachedLink | null> {
  const raw = await safeRedis((r) => r.get(linkCacheKey(code)), null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedLink;
  } catch {
    return null;
  }
}

export async function setCachedLink(code: string, entry: CachedLink) {
  const ttl = "notFound" in entry ? NOT_FOUND_TTL : getEnv().REDIRECT_CACHE_TTL_SECONDS;
  await safeRedis((r) => r.set(linkCacheKey(code), JSON.stringify(entry), "EX", ttl), null);
}

export async function invalidateLinkCache(...codes: string[]) {
  if (codes.length === 0) return;
  await safeRedis((r) => r.del(...codes.map(linkCacheKey)), 0);
}
