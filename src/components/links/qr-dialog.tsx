"use client";

import { useState } from "react";
import { Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function QrDialog({
  linkId,
  code,
  shortUrl,
  trigger,
}: {
  linkId: string;
  code: string;
  shortUrl: string;
  trigger?: React.ReactNode;
}) {
  const [utm, setUtm] = useState(true);
  const q = utm ? "&utm=1" : "";
  const preview = `/api/links/${linkId}/qrcode?format=svg&size=512${q}`;

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            {trigger ?? (
              <Button size="icon-sm" variant="ghost" aria-label="QR Code">
                <QrCode />
              </Button>
            )}
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>QR Code</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">{shortUrl}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-xl border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt={`QR Code do link ${code}`} width={240} height={240} className="size-60" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`qr-utm-${linkId}`} checked={utm} onCheckedChange={setUtm} />
            <Label htmlFor={`qr-utm-${linkId}`} className="text-sm font-normal text-muted-foreground">
              Marcar acessos como origem &quot;QR Code&quot;
            </Label>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <a href={`/api/links/${linkId}/qrcode?format=png&size=1024&download=1${q}`} download>
                <Download data-icon="inline-start" />
                PNG
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/links/${linkId}/qrcode?format=svg&size=1024&download=1${q}`} download>
                <Download data-icon="inline-start" />
                SVG
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
