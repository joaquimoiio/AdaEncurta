"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/common/copy-button";
import { QrDialog } from "@/components/links/qr-dialog";
import { apiFetch, toastApiError } from "@/hooks/use-api";

export type LinkActionsProps = {
  link: {
    id: string;
    code: string;
    shortUrl: string;
    isActive: boolean;
    inactiveTitle?: string | null;
    inactiveMessage?: string | null;
  };
  compact?: boolean;
  afterDelete?: "refresh" | "list";
};

export const DEFAULT_INACTIVE_TITLE = "Link desativado";
export const DEFAULT_INACTIVE_MESSAGE = "Este link foi desativado e não está mais redirecionando.";

export function LinkActions({ link, compact = true, afterDelete = "refresh" }: LinkActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [inactiveTitle, setInactiveTitle] = useState("");
  const [inactiveMessage, setInactiveMessage] = useState("");

  function openDeactivate() {
    setInactiveTitle(link.inactiveTitle ?? "");
    setInactiveMessage(link.inactiveMessage ?? "");
    setDeactivating(true);
  }

  function setActive(isActive: boolean, extra: Record<string, unknown> = {}) {
    startTransition(async () => {
      try {
        await apiFetch(`/api/links/${link.id}`, { method: "PATCH", body: JSON.stringify({ isActive, ...extra }) });
        toast.success(isActive ? "Link ativado" : "Link desativado");
        setDeactivating(false);
        router.refresh();
      } catch (err) {
        toastApiError(err);
      }
    });
  }

  function confirmDeactivate() {
    // Campos vazios voltam ao texto padrão (a API grava null).
    setActive(false, { inactiveTitle: inactiveTitle.trim() || null, inactiveMessage: inactiveMessage.trim() || null });
  }

  function remove() {
    startTransition(async () => {
      try {
        await apiFetch(`/api/links/${link.id}`, { method: "DELETE" });
        toast.success("Link excluído");
        setConfirmDelete(false);
        if (afterDelete === "list") router.push("/admin/links");
        router.refresh();
      } catch (err) {
        toastApiError(err);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <CopyButton value={link.shortUrl} />
      <QrDialog linkId={link.id} code={link.code} shortUrl={link.shortUrl} />
      {!compact ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/links/${link.id}/editar`}>
            <Pencil data-icon="inline-start" />
            Editar
          </Link>
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Mais ações" disabled={pending}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {compact ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/admin/links/${link.id}`}>
                  <BarChart3 />
                  Estatísticas
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/links/${link.id}/editar`}>
                  <Pencil />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onSelect={() => (link.isActive ? openDeactivate() : setActive(true))}>
            <Power />
            {link.isActive ? "Desativar" : "Ativar"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deactivating} onOpenChange={setDeactivating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar link</DialogTitle>
            <DialogDescription>
              Personalize o que os visitantes verão ao abrir <span className="font-mono">{link.shortUrl}</span>. Deixe em branco para usar o
              texto padrão.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`inactive-title-${link.id}`}>Título</Label>
              <Input
                id={`inactive-title-${link.id}`}
                value={inactiveTitle}
                onChange={(e) => setInactiveTitle(e.target.value)}
                placeholder={DEFAULT_INACTIVE_TITLE}
                maxLength={120}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`inactive-message-${link.id}`}>Mensagem</Label>
              <Textarea
                id={`inactive-message-${link.id}`}
                rows={3}
                value={inactiveMessage}
                onChange={(e) => setInactiveMessage(e.target.value)}
                placeholder={DEFAULT_INACTIVE_MESSAGE}
                maxLength={500}
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-4 text-center">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Prévia</p>
              <p className="text-lg font-semibold tracking-tight">{inactiveTitle.trim() || DEFAULT_INACTIVE_TITLE}</p>
              <p className="mx-auto mt-1 max-w-sm whitespace-pre-line text-sm text-muted-foreground">
                {inactiveMessage.trim() || DEFAULT_INACTIVE_MESSAGE}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivating(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={confirmDeactivate} disabled={pending}>
              Desativar link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir link?</DialogTitle>
            <DialogDescription>
              A URL curta <span className="font-mono">{link.shortUrl}</span> deixará de funcionar imediatamente. O histórico de cliques é
              preservado nos relatórios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
