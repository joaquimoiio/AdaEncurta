"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Granularity, SeriesPoint } from "@/server/stats";
import { formatNumber } from "@/lib/format";

function labelFor(bucket: string, granularity: Granularity) {
  const d = new Date(bucket);
  if (granularity === "hour") return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(d);
  if (granularity === "month") return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(d);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(d);
}

function fullLabel(bucket: string, granularity: Granularity) {
  const d = new Date(bucket);
  if (granularity === "hour") return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
  if (granularity === "week") return `Semana de ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d)}`;
  if (granularity === "month") return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(d);
}

export function ClicksChart({ data, granularity, height = 280 }: { data: SeriesPoint[]; granularity: Granularity; height?: number }) {
  const total = data.reduce((a, p) => a + p.clicks, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Nenhum clique no período selecionado.
      </div>
    );
  }
  const points = data.map((p) => ({ ...p, label: labelFor(p.bucket, granularity) }));
  const tickInterval = Math.max(0, Math.ceil(points.length / 8) - 1);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            minTickGap={16}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={48} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as SeriesPoint;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="mb-1 font-medium">{fullLabel(p.bucket, granularity)}</p>
                  <p className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: "var(--chart-1)" }} />
                    Cliques: <span className="font-semibold tabular-nums">{formatNumber(p.clicks)}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: "var(--chart-2)" }} />
                    Visitantes: <span className="font-semibold tabular-nums">{formatNumber(p.visitors)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="clicks" name="Cliques" stroke="var(--chart-1)" strokeWidth={2} fill="url(#fillClicks)" dot={false} activeDot={{ r: 4 }} />
          <Area type="monotone" dataKey="visitors" name="Visitantes" stroke="var(--chart-2)" strokeWidth={2} fill="url(#fillVisitors)" dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
