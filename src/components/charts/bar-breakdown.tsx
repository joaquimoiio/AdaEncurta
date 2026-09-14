"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

export function BarBreakdown({
  data,
  labels,
  height = 220,
  color = "var(--chart-1)",
}: {
  data: { label: string; value: number }[];
  labels?: Record<string, string>;
  height?: number;
  color?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Sem dados no período.
      </div>
    );
  }
  const rows = data.slice(0, 8).map((d) => ({ ...d, name: labels?.[d.label] ?? d.label }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "var(--foreground)" }} />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <span className="font-medium">{p.payload.name}</span>: {formatNumber(Number(p.value))}
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
            {rows.map((_, i) => (
              <Cell key={i} fill={i === 0 ? color : `color-mix(in oklch, ${color} ${Math.max(35, 85 - i * 10)}%, var(--muted))`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
