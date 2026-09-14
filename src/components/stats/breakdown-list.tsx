import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";

export type BreakdownItem = { label: string; value: number };

export function BreakdownList({
  title,
  description,
  items,
  labels,
  emptyText = "Sem dados no período.",
  color = "var(--chart-1)",
}: {
  title: string;
  description?: string;
  items: BreakdownItem[];
  labels?: Record<string, string>;
  emptyText?: string;
  color?: string;
}) {
  const total = items.reduce((acc, i) => acc + i.value, 0);
  const max = items[0]?.value ?? 0;
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{labels?.[item.label] ?? item.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatNumber(item.value)} <span className="text-xs">({formatPercent(item.value, total)})</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${max ? Math.max(3, (item.value / max) * 100) : 0}%`, backgroundColor: color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
