import { isRedisReady, redis } from "@/lib/redis";

export type RateLimitResult = { allowed: boolean; remaining: number; limit: number; resetSeconds: number };

const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    memoryBuckets.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    if (memoryBuckets.size > 10_000) {
      for (const [k, b] of memoryBuckets) if (b.expiresAt <= now) memoryBuckets.delete(k);
    }
    return { allowed: true, remaining: limit - 1, limit, resetSeconds: windowSeconds };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    limit,
    resetSeconds: Math.ceil((bucket.expiresAt - now) / 1000),
  };
}

/**
 * Rate limit de janela fixa. Usa Redis (INCR + EXPIRE atômicos) e cai para
 * memória local se o Redis estiver indisponível.
 */
export async function rateLimit(scope: string, identifier: string, limit: number, windowSeconds = 60): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rl:${scope}:${identifier}:${window}`;

  if (!isRedisReady()) return memoryLimit(key, limit, windowSeconds);

  try {
    const results = await redis.multi().incr(key).expire(key, windowSeconds).exec();
    const count = Number(results?.[0]?.[1] ?? 1);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit, resetSeconds: windowSeconds };
  } catch {
    return memoryLimit(key, limit, windowSeconds);
  }
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "Retry-After": String(r.resetSeconds),
  };
}
