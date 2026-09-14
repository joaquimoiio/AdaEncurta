import { customAlphabet } from "nanoid";

/** Alfabeto sem caracteres ambíguos (0/o, 1/l/i). Minúsculo para leitura fácil. */
export const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CODE_LENGTH = 7;
export const CODE_MIN_LENGTH = 3;
export const CODE_MAX_LENGTH = 64;
export const CODE_REGEX = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;

/** Caminhos do próprio app que jamais podem virar código curto. */
export const RESERVED_CODES = new Set([
  "admin",
  "api",
  "_next",
  "static",
  "public",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "login",
  "logout",
  "auth",
  "dashboard",
  "links",
  "link-indisponivel",
  "campaigns",
  "campanhas",
  "reports",
  "relatorios",
  "health",
  "healthz",
  "qr",
  "assets",
  "images",
  "img",
]);

const generate = customAlphabet(CODE_ALPHABET, CODE_LENGTH);

export function generateCode(length = CODE_LENGTH): string {
  return length === CODE_LENGTH ? generate() : customAlphabet(CODE_ALPHABET, length)();
}

export function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

export type CodeValidation = { ok: true; code: string } | { ok: false; reason: string };

export function validateCustomCode(raw: string): CodeValidation {
  const code = normalizeCode(raw);
  if (code.length < CODE_MIN_LENGTH || code.length > CODE_MAX_LENGTH) {
    return { ok: false, reason: `O código deve ter entre ${CODE_MIN_LENGTH} e ${CODE_MAX_LENGTH} caracteres.` };
  }
  if (!CODE_REGEX.test(code)) {
    return { ok: false, reason: "Use apenas letras, números, hífen e underline (sem começar ou terminar com - ou _)." };
  }
  if (RESERVED_CODES.has(code)) {
    return { ok: false, reason: "Este código é reservado pelo sistema." };
  }
  return { ok: true, code };
}
