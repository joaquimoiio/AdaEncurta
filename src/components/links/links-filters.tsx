"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CampaignOption = { id: string; name: string };

export function LinksFilters({ campaigns }: { campaigns: CampaignOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.push(`${pathname}?${sp.toString()}`));
  }

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por código, título ou URL…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Select value={params.get("status") ?? "all"} onValueChange={(v) => update({ status: v })}>
        <SelectTrigger className="w-full sm:w-36" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>
      <Select value={params.get("campaignId") ?? "all"} onValueChange={(v) => update({ campaignId: v })}>
        <SelectTrigger className="w-full sm:w-48" aria-label="Campanha">
          <SelectValue placeholder="Campanha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as campanhas</SelectItem>
          {campaigns.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={params.get("sort") ?? "createdAt"} onValueChange={(v) => update({ sort: v === "createdAt" ? null : v })}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Ordenar">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Mais recentes</SelectItem>
          <SelectItem value="clickCount">Mais clicados</SelectItem>
          <SelectItem value="title">Título</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
