import Link from "next/link";
import { AdaLogo } from "@/components/brand/ada-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <AdaLogo className="h-10 w-auto" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground max-w-md">O endereço que você acessou não existe ou foi removido.</p>
      </div>
      <Button asChild>
        <Link href="/admin">Ir para o painel</Link>
      </Button>
    </main>
  );
}
