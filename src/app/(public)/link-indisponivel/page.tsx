import type { Metadata } from "next";
import { AdaLogo } from "@/components/brand/ada-logo";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/short-code";

export const metadata: Metadata = { title: "Link indisponível", robots: { index: false } };
export const dynamic = "force-dynamic";

const MESSAGES: Record<string, { title: string; text: string }> = {
  not_found: { title: "Link não encontrado", text: "Verifique se o endereço foi digitado corretamente." },
  inactive: { title: "Link desativado", text: "Este link foi desativado e não está mais redirecionando." },
  expired: { title: "Link expirado", text: "O prazo de validade deste link terminou." },
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Mensagem personalizada definida ao desativar o link (campos vazios usam o texto padrão). */
async function customInactiveMessage(rawCode: string | undefined) {
  const code = rawCode ? normalizeCode(rawCode) : "";
  if (!code) return null;
  const link = await prisma.link.findFirst({
    where: { code, deletedAt: null, isActive: false },
    select: { inactiveTitle: true, inactiveMessage: true },
  });
  return link;
}

export default async function UnavailablePage({ searchParams }: PageProps<"/link-indisponivel">) {
  const sp = await searchParams;
  const motivo = first(sp.motivo);
  const base = MESSAGES[motivo ?? ""] ?? MESSAGES.not_found;
  const custom = motivo === "inactive" ? await customInactiveMessage(first(sp.c)) : null;
  const msg = {
    title: custom?.inactiveTitle || base.title,
    text: custom?.inactiveMessage || base.text,
  };
  return (
    <main className="flex min-h-dvh px-4 flex-col items-center justify-center gap-6 text-center">
      <AdaLogo className="h-10" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{msg.title}</h1>
        <p className="max-w-md whitespace-pre-line text-muted-foreground">{msg.text}</p>
      </div>
      <a href="https://adanutraceuticos.com.br" className="text-sm font-medium text-primary hover:underline">
        Ir para adanutraceuticos.com.br
      </a>
    </main>
  );
}
