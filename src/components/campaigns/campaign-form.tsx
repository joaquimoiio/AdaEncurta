"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/hooks/use-api";
import { toDateInputValue } from "@/lib/format";

export type CampaignFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  isActive: boolean;
};

export function CampaignForm({
  campaign,
  onSaved,
  onCancel,
}: {
  campaign?: CampaignFormValues;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(campaign?.id);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [s, setS] = useState({
    name: campaign?.name ?? "",
    slug: campaign?.slug ?? "",
    description: campaign?.description ?? "",
    utmSource: campaign?.utmSource ?? "",
    utmMedium: campaign?.utmMedium ?? "",
    utmCampaign: campaign?.utmCampaign ?? "",
    utmTerm: campaign?.utmTerm ?? "",
    utmContent: campaign?.utmContent ?? "",
    startsAt: campaign?.startsAt ? toDateInputValue(new Date(campaign.startsAt)) : "",
    endsAt: campaign?.endsAt ? toDateInputValue(new Date(campaign.endsAt)) : "",
    isActive: campaign?.isActive ?? true,
  });

  function set<K extends keyof typeof s>(k: K, v: (typeof s)[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: s.name,
      slug: s.slug || null,
      description: s.description || null,
      utmSource: s.utmSource || null,
      utmMedium: s.utmMedium || null,
      utmCampaign: s.utmCampaign || null,
      utmTerm: s.utmTerm || null,
      utmContent: s.utmContent || null,
      startsAt: s.startsAt ? new Date(`${s.startsAt}T00:00:00`).toISOString() : null,
      endsAt: s.endsAt ? new Date(`${s.endsAt}T23:59:59`).toISOString() : null,
      isActive: s.isActive,
    };
    startTransition(async () => {
      try {
        const saved = isEdit
          ? await apiFetch<{ id: string }>(`/api/campaigns/${campaign!.id}`, { method: "PATCH", body: JSON.stringify(payload) })
          : await apiFetch<{ id: string }>("/api/campaigns", { method: "POST", body: JSON.stringify(payload) });
        toast.success(isEdit ? "Campanha atualizada" : "Campanha criada");
        router.refresh();
        onSaved?.(saved.id);
      } catch (err) {
        if (err instanceof ApiClientError && err.issues.length) {
          setErrors(Object.fromEntries(err.issues.map((i) => [i.path || "form", i.message])));
        } else {
          toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
        }
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <F label="Nome" id="name" error={errors.name} required>
        <Input id="name" value={s.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} placeholder="Lançamento primavera 2026" />
      </F>
      <F label="Slug (opcional)" id="slug" error={errors.slug}>
        <Input id="slug" value={s.slug} onChange={(e) => set("slug", e.target.value)} placeholder="gerado a partir do nome" maxLength={80} />
      </F>
      <F label="Descrição (opcional)" id="description" error={errors.description}>
        <Textarea id="description" rows={2} value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
      </F>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Início (opcional)" id="startsAt" error={errors.startsAt}>
          <Input id="startsAt" type="date" value={s.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </F>
        <F label="Fim (opcional)" id="endsAt" error={errors.endsAt}>
          <Input id="endsAt" type="date" value={s.endsAt} min={s.startsAt || undefined} onChange={(e) => set("endsAt", e.target.value)} />
        </F>
      </div>
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">UTMs padrão da campanha</legend>
        <p className="text-xs text-muted-foreground">Aplicados a todos os links da campanha (o link pode sobrescrever). utm_campaign usa o slug se vazio.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="utm_source" id="c-utmSource" error={errors.utmSource}>
            <Input id="c-utmSource" value={s.utmSource} onChange={(e) => set("utmSource", e.target.value)} placeholder="newsletter" />
          </F>
          <F label="utm_medium" id="c-utmMedium" error={errors.utmMedium}>
            <Input id="c-utmMedium" value={s.utmMedium} onChange={(e) => set("utmMedium", e.target.value)} placeholder="email" />
          </F>
          <F label="utm_campaign" id="c-utmCampaign" error={errors.utmCampaign}>
            <Input id="c-utmCampaign" value={s.utmCampaign} onChange={(e) => set("utmCampaign", e.target.value)} placeholder={s.slug || "slug"} />
          </F>
          <F label="utm_term" id="c-utmTerm" error={errors.utmTerm}>
            <Input id="c-utmTerm" value={s.utmTerm} onChange={(e) => set("utmTerm", e.target.value)} />
          </F>
          <F label="utm_content" id="c-utmContent" error={errors.utmContent} className="sm:col-span-2">
            <Input id="c-utmContent" value={s.utmContent} onChange={(e) => set("utmContent", e.target.value)} />
          </F>
        </div>
      </fieldset>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="c-isActive" className="text-sm font-medium">
            Campanha ativa
          </Label>
          <p className="text-xs text-muted-foreground">Campanhas inativas não aplicam UTMs aos links.</p>
        </div>
        <Switch id="c-isActive" checked={s.isActive} onCheckedChange={(v) => set("isActive", v)} />
      </div>
      {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
          {isEdit ? "Salvar" : "Criar campanha"}
        </Button>
      </div>
    </form>
  );
}

function F({ label, id, error, required, className, children }: { label: string; id: string; error?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
