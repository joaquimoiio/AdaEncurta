"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { PERIOD_PRESETS } from "@/lib/period";
import { toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PeriodFilter({ preset, from, to }: { preset: string; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [de, setDe] = useState(toDateInputValue(new Date(from)));
  const [ate, setAte] = useState(toDateInputValue(new Date(to)));

  function navigate(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", pending && "opacity-70")}>
      <div className="flex rounded-lg border bg-card p-0.5">
        {PERIOD_PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? "default" : "ghost"}
            className={cn("h-7 px-2.5", preset !== p.key && "text-muted-foreground")}
            onClick={() => navigate({ periodo: p.key, de: null, ate: null })}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" variant={preset === "custom" ? "default" : "outline"} className="h-8">
            <CalendarRange data-icon="inline-start" />
            {preset === "custom" ? `${de.split("-").reverse().join("/")} – ${ate.split("-").reverse().join("/")}` : "Personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="periodo-de">De</Label>
            <Input id="periodo-de" type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="periodo-ate">Até</Label>
            <Input id="periodo-ate" type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
          </div>
          <Button
            className="w-full"
            disabled={!de || !ate || de > ate}
            onClick={() => {
              navigate({ periodo: null, de, ate });
              setOpen(false);
            }}
          >
            Aplicar
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
