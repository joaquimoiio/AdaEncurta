import type { RefererSource } from "@/generated/prisma/enums";

const SEARCH = [/(^|\.)google\./, /(^|\.)bing\.com$/, /(^|\.)yahoo\./, /duckduckgo\.com$/, /(^|\.)baidu\.com$/, /(^|\.)yandex\./, /ecosia\.org$/];
const SOCIAL = [
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.com$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)t\.co$/,
  /(^|\.)linkedin\.com$/,
  /(^|\.)lnkd\.in$/,
  /(^|\.)youtube\.com$/,
  /(^|\.)youtu\.be$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)whatsapp\.com$/,
  /(^|\.)telegram\.org$/,
  /(^|\.)t\.me$/,
  /(^|\.)pinterest\./,
  /(^|\.)reddit\.com$/,
  /(^|\.)threads\.net$/,
];
const EMAIL = [/mail\.google\.com$/, /outlook\./, /(^|\.)mail\.yahoo\./, /(^|\.)protonmail\./, /(^|\.)proton\.me$/];

export type RefererInfo = { host: string | null; source: RefererSource };

/**
 * Classifica a origem. Apenas o host do referer é retornado (sem path/query),
 * reduzindo a coleta de dados a um mínimo útil.
 */
export function classifyReferer(
  referer: string | null | undefined,
  utm?: { utmMedium?: string | null; utmSource?: string | null },
): RefererInfo {
  const medium = utm?.utmMedium?.toLowerCase();
  const utmSource = utm?.utmSource?.toLowerCase();

  let host: string | null = null;
  if (referer) {
    try {
      host = new URL(referer).hostname.toLowerCase().replace(/^www\./, "") || null;
    } catch {
      host = null;
    }
  }

  if (medium === "qr" || medium === "qrcode" || utmSource === "qr" || utmSource === "qrcode") {
    return { host, source: "QR" };
  }
  if (medium === "email" || medium === "e-mail" || medium === "newsletter") return { host, source: "EMAIL" };
  if (medium === "cpc" || medium === "ppc" || medium === "paid" || medium === "paid_social" || medium === "display") {
    return { host, source: "PAID" };
  }
  if (medium === "social") return { host, source: "SOCIAL" };

  if (!host) return { host: null, source: "DIRECT" };
  if (EMAIL.some((r) => r.test(host!))) return { host, source: "EMAIL" };
  if (SEARCH.some((r) => r.test(host!))) return { host, source: "SEARCH" };
  if (SOCIAL.some((r) => r.test(host!))) return { host, source: "SOCIAL" };
  return { host, source: "REFERRAL" };
}
