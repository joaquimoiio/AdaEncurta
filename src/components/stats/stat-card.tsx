import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "orange",
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  accent?: "orange" | "green" | "neutral";
  className?: string;
}) {
  return (
    <Card className={cn("gap-2 px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              accent === "orange" && "bg-ada-orange-soft-2 text-ada-orange-dark",
              accent === "green" && "bg-emerald-50 text-ada-green-2",
              accent === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
        {typeof value === "number" ? formatCompact(value) : value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
