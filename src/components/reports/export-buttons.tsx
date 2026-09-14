"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({ query }: { query: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <a href={`/api/reports/export?type=clicks&${query}`}>
          <Download data-icon="inline-start" />
          Exportar cliques (CSV)
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={`/api/reports/export?type=links&${query}`}>
          <FileSpreadsheet data-icon="inline-start" />
          Exportar resumo por link (CSV)
        </a>
      </Button>
    </div>
  );
}
