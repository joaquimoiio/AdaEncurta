"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CampaignForm, type CampaignFormValues } from "@/components/campaigns/campaign-form";
import { apiFetch, toastApiError } from "@/hooks/use-api";

export function NewCampaignDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" />
          Nova campanha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>Agrupe links e defina UTMs padrão.</DialogDescription>
        </DialogHeader>
        <CampaignForm
          onSaved={(id) => {
            setOpen(false);
            router.push(`/admin/campanhas/${id}`);
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditCampaignDialog({ campaign }: { campaign: CampaignFormValues }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil data-icon="inline-start" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar campanha</DialogTitle>
        </DialogHeader>
        <CampaignForm campaign={campaign} onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCampaignButton({ id, name, linkCount }: { id: string; name: string; linkCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    startTransition(async () => {
      try {
        await apiFetch(`/api/campaigns/${id}`, { method: "DELETE" });
        toast.success("Campanha excluída");
        router.push("/admin/campanhas");
        router.refresh();
      } catch (err) {
        toastApiError(err);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 data-icon="inline-start" />
          Excluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir campanha “{name}”?</DialogTitle>
          <DialogDescription>
            {linkCount > 0
              ? `Os ${linkCount} links associados serão mantidos, mas ficarão sem campanha.`
              : "Esta ação não pode ser desfeita."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={remove} disabled={pending}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
