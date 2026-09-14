const numberFormatter = new Intl.NumberFormat("pt-BR");
const compactFormatter = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(n: number) {
  return numberFormatter.format(n);
}

export function formatCompact(n: number) {
  return n >= 10_000 ? compactFormatter.format(n) : numberFormatter.format(n);
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { dateStyle: "short" }) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", opts).format(d);
}

export function formatDateTime(value: string | Date) {
  return formatDate(value, { dateStyle: "short", timeStyle: "short" });
}

export function formatPercent(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export function truncateMiddle(value: string, max = 48) {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.6);
  const tail = max - 1 - head;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export const DEVICE_LABELS: Record<string, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Celular",
  TABLET: "Tablet",
  BOT: "Bot",
  OTHER: "Outro",
};

export const SOURCE_LABELS: Record<string, string> = {
  DIRECT: "Direto",
  SEARCH: "Busca",
  SOCIAL: "Redes sociais",
  EMAIL: "E-mail",
  PAID: "Mídia paga",
  REFERRAL: "Referência",
  QR: "QR Code",
  OTHER: "Outro",
};

export function toDateInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
