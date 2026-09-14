import QRCode from "qrcode";

export type QrFormat = "png" | "svg";

/** Gera QR Code apontando para a URL curta. Verde escuro da identidade ADA sobre branco (alto contraste para leitura). */
export async function generateQrCode(url: string, format: QrFormat, size = 512): Promise<{ body: Buffer | string; contentType: string }> {
  const options = {
    errorCorrectionLevel: "M" as const,
    margin: 2,
    width: Math.min(Math.max(size, 128), 2048),
    color: { dark: "#002320", light: "#ffffff" },
  };
  if (format === "svg") {
    const svg = await QRCode.toString(url, { ...options, type: "svg" });
    return { body: svg, contentType: "image/svg+xml" };
  }
  const png = await QRCode.toBuffer(url, { ...options, type: "png" });
  return { body: png, contentType: "image/png" };
}
