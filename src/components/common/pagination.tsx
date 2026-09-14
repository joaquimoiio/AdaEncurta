import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        {start}–{end} de {total}
      </p>
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon-sm" aria-label="Página anterior" disabled={page <= 1}>
          {page <= 1 ? <span aria-disabled><ChevronLeft /></span> : <Link href={buildHref(page - 1)}><ChevronLeft /></Link>}
        </Button>
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button asChild variant="outline" size="icon-sm" aria-label="Próxima página" disabled={page >= totalPages}>
          {page >= totalPages ? <span aria-disabled><ChevronRight /></span> : <Link href={buildHref(page + 1)}><ChevronRight /></Link>}
        </Button>
      </div>
    </div>
  );
}
