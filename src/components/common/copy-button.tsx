"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copiar URL curta",
  size = "icon-sm",
  variant = "ghost",
  className,
  showLabel = false,
}: {
  value: string;
  label?: string;
  size?: "icon-xs" | "icon-sm" | "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "default" | "secondary";
  className?: string;
  showLabel?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("URL copiada", { description: value });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente: " + value);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" size={size} variant={variant} onClick={copy} aria-label={label} className={cn(className)}>
          {copied ? <Check className="text-primary" data-icon={showLabel ? "inline-start" : undefined} /> : <Copy data-icon={showLabel ? "inline-start" : undefined} />}
          {showLabel ? (copied ? "Copiado" : "Copiar") : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
