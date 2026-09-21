"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dices, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiClientError } from "@/hooks/use-api";
import { generateCode, validateCustomCode } from "@/lib/short-code";
import { toDateInputValue } from "@/lib/format";
import type { SerializedLink } from "@/server/links";

type CampaignOption = { id: string; name: string; slug: string };

type FormState = {
  originalUrl: string;
  code: string;
  title: string;
  description: string;
  campaignId: string;
  expiresAt: string;
  isActive: boolean;
  inactiveTitle: string;
  inactiveMessage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

const NONE = "__none__";

function toState(link?: SerializedLink): FormState {
  return {
    originalUrl: link?.originalUrl ?? "",
    code: link?.code ?? "",
    title: link?.title ?? "",
    description: link?.description ?? "",
    campaignId: link?.campaignId ?? NONE,
    expiresAt: link?.expiresAt ? toDateInputValue(new Date(link.expiresAt)) : "",
    isActive: link?.isActive ?? true,
    inactiveTitle: link?.inactiveTitle ?? "",
    inactiveMessage: link?.inactiveMessage ?? "",
    utmSource: link?.utmSource ?? "",
    utmMedium: link?.utmMedium ?? "",
    utmCampaign: link?.utmCampaign ?? "",
    utmTerm: link?.utmTerm ?? "",
    utmContent: link?.utmContent ?? "",
  };
}

export function LinkForm({
  link,
  campaigns,
  shortBaseUrl,
}: {
  link?: SerializedLink;
  campaigns: CampaignOption[];
  shortBaseUrl: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => toState(link));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(link);

  const codeCheck = useMemo(() => (state.code ? validateCustomCode(state.code) : null), [state.code]);
  const previewCode = state.code ? state.code.trim().toLowerCase() : "código-gerado";

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const payload = {
      originalUrl: state.originalUrl,
      code: state.code || null,
      title: state.title || null,
      description: state.description || null,
      campaignId: state.campaignId === NONE ? null : state.campaignId,
      expiresAt: state.expiresAt ? new Date(`${state.expiresAt}T23:59:59`).toISOString() : null,
      isActive: state.isActive,
      inactiveTitle: state.inactiveTitle || null,
      inactiveMessage: state.inactiveMessage || null,
      utmSource: state.utmSource || null,
      utmMedium: state.utmMedium || null,
      utmCampaign: state.utmCampaign || null,
      utmTerm: state.utmTerm || null,
      utmContent: state.utmContent || null,
    };

    startTransition(async () => {
      try {
        const saved = isEdit
          ? await apiFetch<SerializedLink>(`/api/links/${link!.id}`, { method: "PATCH", body: JSON.stringify(payload) })
          : await apiFetch<SerializedLink>("/api/links", { method: "POST", body: JSON.stringify(payload) });
        toast.success(isEdit ? "Link atualizado" : "Link criado", { description: saved.shortUrl });
        router.push(`/admin/links/${saved.id}`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.issues.length) {
            setErrors(Object.fromEntries(err.issues.map((i) => [i.path || "form", i.message])));
          } else if (err.status === 409) {
            setErrors({ code: err.message });
          } else {
            toast.error(err.message);
          }
          return;
        }
        toast.error("Não foi possível salvar o link.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Destino</CardTitle>
            <CardDescription>Para onde a URL curta deve levar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="URL original" htmlFor="originalUrl" error={errors.originalUrl} required>
              <Input
                id="originalUrl"
                type="url"
                inputMode="url"
                placeholder="https://adanutraceuticos.com.br/products/creatina"
                value={state.originalUrl}
                onChange={(e) => set("originalUrl", e.target.value)}
                aria-invalid={Boolean(errors.originalUrl)}
                required
                autoFocus={!isEdit}
              />
            </Field>
            <Field label="Título (opcional)" htmlFor="title" error={errors.title}>
              <Input id="title" placeholder="Ex.: Página do produto 123" value={state.title} onChange={(e) => set("title", e.target.value)} maxLength={160} />
            </Field>
            <Field label="Descrição (opcional)" htmlFor="description" error={errors.description}>
              <Textarea id="description" rows={2} value={state.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>URL curta</CardTitle>
            <CardDescription>Deixe em branco para gerar um código automaticamente ou personalize.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Código personalizado" htmlFor="code" error={errors.code ?? (codeCheck && !codeCheck.ok ? codeCheck.reason : undefined)}>
              <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 items-center rounded-lg border bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                  <span className="hidden shrink-0 select-none border-r px-3 text-sm text-muted-foreground sm:block">{shortBaseUrl.replace(/^https?:\/\//, "")}/</span>
                  <Input
                    id="code"
                    className="border-0 shadow-none focus-visible:ring-0"
                    placeholder="produto123"
                    value={state.code}
                    onChange={(e) => set("code", e.target.value)}
                    aria-invalid={Boolean(errors.code) || (codeCheck ? !codeCheck.ok : false)}
                    maxLength={64}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => set("code", generateCode())} title="Gerar código aleatório">
                  <Dices data-icon="inline-start" />
                  Gerar
                </Button>
              </div>
            </Field>
            <p className="text-sm text-muted-foreground">
              Prévia:{" "}
              <span className="font-mono text-foreground">
                {shortBaseUrl}/{previewCode}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parâmetros UTM (opcional)</CardTitle>
            <CardDescription>
              Adicionados à URL de destino no redirecionamento. Sobrescrevem os UTMs da campanha; não sobrescrevem parâmetros já presentes
              na URL original.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="utm_source" htmlFor="utmSource" error={errors.utmSource}>
              <Input id="utmSource" placeholder="instagram" value={state.utmSource} onChange={(e) => set("utmSource", e.target.value)} />
            </Field>
            <Field label="utm_medium" htmlFor="utmMedium" error={errors.utmMedium}>
              <Input id="utmMedium" placeholder="social" value={state.utmMedium} onChange={(e) => set("utmMedium", e.target.value)} />
            </Field>
            <Field label="utm_campaign" htmlFor="utmCampaign" error={errors.utmCampaign}>
              <Input id="utmCampaign" placeholder="lancamento-2026" value={state.utmCampaign} onChange={(e) => set("utmCampaign", e.target.value)} />
            </Field>
            <Field label="utm_term" htmlFor="utmTerm" error={errors.utmTerm}>
              <Input id="utmTerm" value={state.utmTerm} onChange={(e) => set("utmTerm", e.target.value)} />
            </Field>
            <Field label="utm_content" htmlFor="utmContent" error={errors.utmContent} className="sm:col-span-2">
              <Input id="utmContent" value={state.utmContent} onChange={(e) => set("utmContent", e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Campanha" htmlFor="campaignId" error={errors.campaignId}>
              <Select value={state.campaignId} onValueChange={(v) => set("campaignId", v ?? NONE)}>
                <SelectTrigger id="campaignId" className="w-full">
                  <SelectValue placeholder="Sem campanha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem campanha</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Expira em (opcional)" htmlFor="expiresAt" error={errors.expiresAt}>
              <Input id="expiresAt" type="date" value={state.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} min={toDateInputValue(new Date())} />
            </Field>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="isActive" className="text-sm font-medium">
                  Link ativo
                </Label>
                <p className="text-xs text-muted-foreground">Links inativos não redirecionam.</p>
              </div>
              <Switch id="isActive" checked={state.isActive} onCheckedChange={(v) => set("isActive", v)} />
            </div>
            {!state.isActive ? (
              <div className="grid gap-4 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Mensagem exibida aos visitantes. Em branco, usa o texto padrão.</p>
                <Field label="Título" htmlFor="inactiveTitle" error={errors.inactiveTitle}>
                  <Input
                    id="inactiveTitle"
                    placeholder="Link desativado"
                    value={state.inactiveTitle}
                    onChange={(e) => set("inactiveTitle", e.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Mensagem" htmlFor="inactiveMessage" error={errors.inactiveMessage}>
                  <Textarea
                    id="inactiveMessage"
                    rows={3}
                    placeholder="Este link foi desativado e não está mais redirecionando."
                    value={state.inactiveMessage}
                    onChange={(e) => set("inactiveMessage", e.target.value)}
                    maxLength={500}
                  />
                </Field>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild type="button" variant="outline">
            <Link href={isEdit ? `/admin/links/${link!.id}` : "/admin/links"}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={pending || (codeCheck ? !codeCheck.ok : false)}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}
            {isEdit ? "Salvar alterações" : "Criar link"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>
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
