import { describe, expect, it } from "vitest";
import { normalizeUtm } from "../../mcp/utm";

describe("normalizeUtm (MCP)", () => {
  it("padroniza para minúsculas, sem acento e com hífens", () => {
    expect(normalizeUtm("  Lançamento Creatina 2026 ")).toBe("lancamento-creatina-2026");
    expect(normalizeUtm("Instagram")).toBe("instagram");
  });
  it("preserva null/undefined e mantém _ . +", () => {
    expect(normalizeUtm(null)).toBeNull();
    expect(normalizeUtm(undefined)).toBeUndefined();
    expect(normalizeUtm("a_b.c+d")).toBe("a_b.c+d");
  });
});
