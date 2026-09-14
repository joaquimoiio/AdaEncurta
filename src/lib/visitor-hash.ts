import { createHmac } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Identificador pseudônimo, rotativo por dia, para contagem de visitantes únicos.
 * Usa HMAC(segredo, dia + ip + user-agent). O IP e o UA não são armazenados,
 * e o hash não pode ser revertido nem correlacionado entre dias (LGPD: minimização).
 */
export function computeVisitorHash(ip: string | null, userAgent: string | null, now = new Date()): string | null {
  if (!ip && !userAgent) return null;
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", getEnv().HASH_SECRET)
    .update(`${day}|${ip ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}
