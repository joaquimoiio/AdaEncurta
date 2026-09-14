import { describe, expect, it } from "vitest";
import { buildDestinationUrl, extractUtmFromSearchParams, mergeUtm, validateDestinationUrl } from "@/lib/url";

describe("validateDestinationUrl", () => {
  it("aceita URLs http/https públicas", () => {
    expect(validateDestinationUrl("https://adanutraceuticos.com.br/products/creatina")).toMatchObject({ ok: true });
    expect(validateDestinationUrl("http://example.com/a?b=1")).toMatchObject({ ok: true });
  });

  it("rejeita protocolos perigosos e credenciais", () => {
    expect(validateDestinationUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateDestinationUrl("ftp://example.com").ok).toBe(false);
    expect(validateDestinationUrl("https://user:pass@example.com").ok).toBe(false);
    expect(validateDestinationUrl("nao-e-url").ok).toBe(false);
    expect(validateDestinationUrl("").ok).toBe(false);
  });

  it("rejeita hosts de rede interna", () => {
    for (const u of ["http://localhost/x", "http://127.0.0.1/x", "http://10.0.0.1/", "http://192.168.1.1/", "http://172.16.0.1/", "http://[::1]/", "http://intranet.local/"]) {
      expect(validateDestinationUrl(u).ok, u).toBe(false);
    }
  });

  it("rejeita URLs acima do limite", () => {
    expect(validateDestinationUrl("https://example.com/" + "a".repeat(2100)).ok).toBe(false);
  });
});

describe("UTM", () => {
  it("adiciona UTMs sem sobrescrever parâmetros existentes", () => {
    const out = buildDestinationUrl("https://example.com/p?utm_source=site&x=1", { utmSource: "instagram", utmMedium: "social" });
    const u = new URL(out);
    expect(u.searchParams.get("utm_source")).toBe("site");
    expect(u.searchParams.get("utm_medium")).toBe("social");
    expect(u.searchParams.get("x")).toBe("1");
  });

  it("devolve a URL original intacta quando não há UTMs", () => {
    expect(buildDestinationUrl("https://example.com/p", {})).toBe("https://example.com/p");
  });

  it("mescla camadas com prioridade para a última", () => {
    expect(mergeUtm({ utmSource: "campanha", utmMedium: "email" }, { utmSource: "link" })).toEqual({ utmSource: "link", utmMedium: "email" });
  });

  it("extrai UTMs da query string", () => {
    const sp = new URLSearchParams("utm_source=qr&utm_campaign=feira&other=1");
    expect(extractUtmFromSearchParams(sp)).toEqual({ utmSource: "qr", utmCampaign: "feira" });
  });
});
