import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo oficial da ADA Nutracêuticos (adanutraceuticos.com.br). */
export function AdaLogo({ className }: { className?: string }) {
  return (
    <Image src="/brand/ada-logo.svg" alt="ADA Nutracêuticos" width={162} height={68} priority className={cn("h-8 w-auto", className)} />
  );
}

/** Marca reduzida (favicon oficial) para espaços pequenos. */
export function AdaMark({ className }: { className?: string }) {
  return <Image src="/brand/ada-mark.png" alt="" aria-hidden width={32} height={32} className={cn("size-8", className)} />;
}
