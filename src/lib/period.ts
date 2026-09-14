import type { Period } from "@/server/stats";

export const PERIOD_PRESETS = [
  { key: "today", label: "Hoje", days: 0 },
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["key"];

/**
 * Interpreta os searchParams (?periodo=7d | ?de=2026-01-01&ate=2026-01-31)
 * e devolve o intervalo de datas.
 */
export function parsePeriod(params: { periodo?: string; de?: string; ate?: string }): Period & { preset: PeriodPreset | "custom" } {
  const now = new Date();
  if (params.de || params.ate) {
    const from = params.de ? new Date(`${params.de}T00:00:00`) : new Date(now.getTime() - 30 * 864e5);
    const to = params.ate ? new Date(`${params.ate}T23:59:59.999`) : now;
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && from <= to) {
      return { from, to, preset: "custom" };
    }
  }
  const preset = PERIOD_PRESETS.find((p) => p.key === params.periodo)?.key ?? "30d";
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now, preset };
  }
  const days = PERIOD_PRESETS.find((p) => p.key === preset)!.days;
  return { from: new Date(now.getTime() - days * 864e5), to: now, preset };
}
