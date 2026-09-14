"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Option = { id: string; name: string };

export function ReportFilters({ campaigns, links }: { campaigns: Option[]; links: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="grid gap-1.5">
        <Label>Campanha</Label>
        <Select value={params.get("campaignId") ?? "all"} onValueChange={(v) => update({ campaignId: v, linkId: null })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Link</Label>
        <Select value={params.get("linkId") ?? "all"} onValueChange={(v) => update({ linkId: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {links.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 self-end rounded-lg border px-3 py-2">
        <Switch id="bots" checked={params.get("bots") === "1"} onCheckedChange={(v) => update({ bots: v ? "1" : null })} />
        <Label htmlFor="bots" className="text-sm font-normal">
          Incluir acessos de bots
        </Label>
      </div>
    </div>
  );
}
