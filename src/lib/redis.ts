import Redis from "ioredis";
import { getEnv } from "@/lib/env";

/**
 * Singleton do Redis. O sistema é tolerante à indisponibilidade do Redis:
 * o redirect cai para o banco e o rate limit cai para memória local.
 */
const globalForRedis = globalThis as unknown as { redis?: Redis; redisHealthy?: boolean };

function createRedis() {
  const client = new Redis(getEnv().REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  client.on("error", (err) => {
    if (globalForRedis.redisHealthy !== false) {
      console.warn("[redis] indisponível, usando fallback:", err.message);
    }
    globalForRedis.redisHealthy = false;
  });
  client.on("ready", () => {
    globalForRedis.redisHealthy = true;
  });
  client.connect().catch(() => {
    /* erro já tratado no listener */
  });
  return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedis();

if (getEnv().NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export function isRedisReady() {
  return redis.status === "ready";
}

/** Executa uma operação no Redis; em caso de falha devolve `fallback` sem lançar. */
export async function safeRedis<T>(fn: (client: Redis) => Promise<T>, fallback: T): Promise<T> {
  if (!isRedisReady()) return fallback;
  try {
    return await fn(redis);
  } catch {
    return fallback;
  }
}
