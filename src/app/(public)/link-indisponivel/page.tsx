import type { Metadata } from "next";
import { AdaLogo } from "@/components/brand/ada-logo";

export const metadata: Metadata = { title: "Link indisponível" };

const MESSAGES: Record<string, { title: string; text: string }> = {
  not_found: { title: "Link não encontrado", text: "Verifique se o endereço foi digitado corretamente." },
  inactive: { title: "Link desativado", text: "Este link foi desativado e não está mais redirecionando." },
  expired: { title: "Link expirado", text: "O prazo de validade deste link terminou." },
};

export default async function UnavailablePage({ searchParams }: PageProps<"/link-indisponivel">) {
  const sp = await searchParams;
  const motivo = Array.isArray(sp.motivo) ? sp.motivo[0] : sp.motivo;
  const msg = MESSAGES[motivo ?? ""] ?? MESSAGES.not_found;
  return (
    <main className="flex min-h-dvh px-4 flex-col items-center justify-center gap-6 text-center">
      <AdaLogo className="h-10" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{msg.title}</h1>
        <p className="max-w-md text-muted-foreground">{msg.text}</p>
      </div>
      <a href="https://adanutraceuticos.com.br" className="text-sm font-medium text-primary hover:underline">
        Ir para adanutraceuticos.com.br
      </a>
    </main>
  );
}
