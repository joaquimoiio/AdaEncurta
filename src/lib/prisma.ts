import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

/**
 * Singleton do Prisma Client (evita múltiplas conexões no hot-reload do Next).
 * Prisma 7 usa driver adapters: aqui o adapter oficial do node-postgres.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: getEnv().DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: getEnv().NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (getEnv().NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
