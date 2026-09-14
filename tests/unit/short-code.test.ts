import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, generateCode, validateCustomCode } from "@/lib/short-code";

describe("short-code", () => {
  it("gera códigos com o tamanho e alfabeto esperados", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
    }
  });

  it("gera códigos únicos", () => {
    const set = new Set(Array.from({ length: 5000 }, () => generateCode()));
    expect(set.size).toBe(5000);
  });

  it("aceita códigos personalizados válidos e normaliza para minúsculas", () => {
    expect(validateCustomCode("Produto123")).toEqual({ ok: true, code: "produto123" });
    expect(validateCustomCode("promo-verao_2026")).toEqual({ ok: true, code: "promo-verao_2026" });
  });

  it("rejeita códigos reservados, curtos ou com caracteres inválidos", () => {
    expect(validateCustomCode("admin").ok).toBe(false);
    expect(validateCustomCode("api").ok).toBe(false);
    expect(validateCustomCode("ab").ok).toBe(false);
    expect(validateCustomCode("com espaço").ok).toBe(false);
    expect(validateCustomCode("-inicio").ok).toBe(false);
    expect(validateCustomCode("fim-").ok).toBe(false);
    expect(validateCustomCode("acentuação").ok).toBe(false);
  });
});
