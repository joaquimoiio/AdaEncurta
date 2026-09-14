import { describe, expect, it } from "vitest";
import { parseUserAgent } from "@/lib/user-agent";
import { classifyReferer } from "@/lib/referer";
import { computeVisitorHash } from "@/lib/visitor-hash";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("parseUserAgent", () => {
  it("identifica celular iOS/Safari", () => {
    const r = parseUserAgent(IPHONE);
    expect(r.deviceType).toBe("MOBILE");
    expect(r.os).toBe("iOS");
    expect(r.browser).toMatch(/Safari/);
    expect(r.isBot).toBe(false);
  });

  it("identifica desktop Windows/Chrome", () => {
    const r = parseUserAgent(CHROME_WIN);
    expect(r.deviceType).toBe("DESKTOP");
    expect(r.os).toBe("Windows");
    expect(r.browser).toBe("Chrome");
    expect(r.browserVersion).toBe("128");
  });

  it("identifica tablet", () => {
    expect(parseUserAgent(IPAD).deviceType).toBe("TABLET");
  });

  it("marca bots e clientes de linha de comando", () => {
    expect(parseUserAgent("curl/8.4.0").isBot).toBe(true);
    expect(parseUserAgent("facebookexternalhit/1.1").deviceType).toBe("BOT");
    expect(parseUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)").isBot).toBe(true);
  });

  it("lida com user-agent ausente", () => {
    expect(parseUserAgent(null)).toMatchObject({ deviceType: "OTHER", isBot: false });
  });
});

describe("classifyReferer", () => {
  it("classifica redes sociais, busca e e-mail pelo host", () => {
    expect(classifyReferer("https://www.instagram.com/p/abc")).toEqual({ host: "instagram.com", source: "SOCIAL" });
    expect(classifyReferer("https://l.facebook.com/l.php?u=x").source).toBe("SOCIAL");
    expect(classifyReferer("https://www.google.com/search?q=ada").source).toBe("SEARCH");
    expect(classifyReferer("https://mail.google.com/mail/u/0/").source).toBe("EMAIL");
    expect(classifyReferer("https://blog.parceiro.com.br/post").source).toBe("REFERRAL");
  });

  it("sem referer é acesso direto; UTM tem prioridade", () => {
    expect(classifyReferer(null)).toEqual({ host: null, source: "DIRECT" });
    expect(classifyReferer(null, { utmMedium: "qr" }).source).toBe("QR");
    expect(classifyReferer("https://www.google.com", { utmMedium: "cpc" }).source).toBe("PAID");
    expect(classifyReferer(null, { utmMedium: "email" }).source).toBe("EMAIL");
  });

  it("guarda apenas o host, nunca o caminho completo", () => {
    const r = classifyReferer("https://www.exemplo.com/pagina/privada?token=123");
    expect(r.host).toBe("exemplo.com");
  });
});

describe("computeVisitorHash", () => {
  it("é determinístico no mesmo dia e muda entre dias (não rastreável a longo prazo)", () => {
    const d1 = new Date("2026-09-14T10:00:00Z");
    const d1b = new Date("2026-09-14T23:00:00Z");
    const d2 = new Date("2026-09-15T01:00:00Z");
    const a = computeVisitorHash("200.1.2.3", IPHONE, d1);
    expect(a).toHaveLength(32);
    expect(computeVisitorHash("200.1.2.3", IPHONE, d1b)).toBe(a);
    expect(computeVisitorHash("200.1.2.3", IPHONE, d2)).not.toBe(a);
    expect(computeVisitorHash("200.1.2.4", IPHONE, d1)).not.toBe(a);
    expect(a).not.toContain("200.1.2.3");
  });

  it("devolve null sem IP e sem UA", () => {
    expect(computeVisitorHash(null, null)).toBeNull();
  });
});
