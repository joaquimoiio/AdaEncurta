"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber, formatPercent } from "@/lib/format";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function DonutChart({
  data,
  labels,
  height = 200,
}: {
  data: { label: string; value: number }[];
  labels?: Record<string, string>;
  height?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Sem dados no período.
      </div>
    );
  }
  const top = data.slice(0, 5).map((d) => ({ ...d, name: labels?.[d.label] ?? d.label }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={top} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {top.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                    <span className="font-medium">{p.name}</span>: {formatNumber(Number(p.value))} ({formatPercent(Number(p.value), total)})
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {top.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatNumber(d.value)} <span className="text-xs">({formatPercent(d.value, total)})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
