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
import { CopyButton } from "@/components/common/copy-button";
import { QrDialog } from "@/components/links/qr-dialog";
import { apiFetch, toastApiError } from "@/hooks/use-api";

export type LinkActionsProps = {
  link: { id: string; code: string; shortUrl: string; isActive: boolean };
  compact?: boolean;
  afterDelete?: "refresh" | "list";
};

export function LinkActions({ link, compact = true, afterDelete = "refresh" }: LinkActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleActive() {
    startTransition(async () => {
      try {
        await apiFetch(`/api/links/${link.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !link.isActive }) });
        toast.success(link.isActive ? "Link desativado" : "Link ativado");
        router.refresh();
      } catch (err) {
        toastApiError(err);
      }
    });
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
          <DropdownMenuItem onSelect={toggleActive}>
            <Power />
            {link.isActive ? "Desativar" : "Ativar"}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
