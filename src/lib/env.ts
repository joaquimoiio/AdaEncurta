import { z } from "zod";

/**
 * Variáveis de ambiente validadas com Zod.
 * Falha cedo (no boot) se algo obrigatório estiver faltando.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SHORT_BASE_URL: z.string().url().default("http://localhost:3000"),
  HASH_SECRET: z.string().min(8).default("dev-only-secret-change-me"),
  RATE_LIMIT_REDIRECT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_API_PER_MINUTE: z.coerce.number().int().positive().default(60),
  REDIRECT_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  ALLOWED_DESTINATION_HOSTS: z.string().default(""),
  GEOIP_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Lista de hosts permitidos como destino (suporta curinga "*.dominio.com"). */
export function getAllowedDestinationHosts(): string[] {
  return getEnv()
    .ALLOWED_DESTINATION_HOSTS.split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}
