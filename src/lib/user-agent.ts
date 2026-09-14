import { UAParser } from "ua-parser-js";
import type { DeviceType } from "@/generated/prisma/enums";

export type ParsedUserAgent = {
  deviceType: DeviceType;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  isBot: boolean;
};

const BOT_REGEX =
  /bot|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|pinterest|embedly|quora link preview|curl\/|wget\/|python-requests|httpclient|go-http-client|headlesschrome|lighthouse|preview|monitor|uptime|scanner/i;

function majorVersion(v?: string): string | null {
  if (!v) return null;
  const major = v.split(".")[0];
  return major || null;
}

/**
 * Converte o user-agent em dados agregáveis. O user-agent bruto NÃO é armazenado.
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua) {
    return { deviceType: "OTHER", browser: null, browserVersion: null, os: null, osVersion: null, isBot: false };
  }
  const isBot = BOT_REGEX.test(ua);
  const result = UAParser(ua);

  let deviceType: DeviceType = "DESKTOP";
  switch (result.device.type) {
    case "mobile":
      deviceType = "MOBILE";
      break;
    case "tablet":
      deviceType = "TABLET";
      break;
    case "console":
    case "smarttv":
    case "wearable":
    case "embedded":
    case "xr":
      deviceType = "OTHER";
      break;
    default:
      deviceType = result.os.name || result.browser.name ? "DESKTOP" : "OTHER";
  }
  if (isBot) deviceType = "BOT";

  return {
    deviceType,
    browser: result.browser.name ?? null,
    browserVersion: majorVersion(result.browser.version),
    os: result.os.name ?? null,
    osVersion: result.os.version ? result.os.version.split(".").slice(0, 2).join(".") : null,
    isBot,
  };
}
