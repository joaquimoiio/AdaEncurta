import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkActions } from "@/components/links/link-actions";
import { formatDate, formatNumber, truncateMiddle } from "@/lib/format";
import type { SerializedLink } from "@/server/links";

export function LinksTable({ links }: { links: SerializedLink[] }) {
  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">Nenhum link encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro link curto para começar a rastrear cliques.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <ul className="grid grid-cols-1 gap-3 md:hidden">
        {links.map((link) => (
          <li key={link.id} className="min-w-0 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/admin/links/${link.id}`} className="block truncate font-medium hover:underline">
                  {link.title || link.code}
                </Link>
                <p className="truncate font-mono text-sm text-primary">{link.shortUrl.replace(/^https?:\/\//, "")}</p>
                <p className="truncate text-xs text-muted-foreground">{truncateMiddle(link.originalUrl, 56)}</p>
              </div>
              <StatusBadge link={link} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="tabular-nums">
                <span className="font-semibold">{formatNumber(link.clickCount)}</span> <span className="text-muted-foreground">cliques</span>
              </span>
              <LinkActions link={link} />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Link</TableHead>
              <TableHead className="hidden lg:table-cell">Campanha</TableHead>
              <TableHead className="text-right">Cliques</TableHead>
              <TableHead className="hidden xl:table-cell">Criado em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((link) => (
              <TableRow key={link.id}>
                <TableCell className="max-w-[420px]">
                  <div className="min-w-0">
                    <Link href={`/admin/links/${link.id}`} className="block truncate font-medium hover:underline">
                      {link.title || link.code}
                    </Link>
                    <p className="truncate font-mono text-xs text-primary">{link.shortUrl.replace(/^https?:\/\//, "")}</p>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span className="truncate">{truncateMiddle(link.originalUrl, 64)}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {link.campaign ? (
                    <Link href={`/admin/campanhas/${link.campaign.id}`} className="text-sm hover:underline">
                      {link.campaign.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{formatNumber(link.clickCount)}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">{formatDate(link.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge link={link} />
                </TableCell>
                <TableCell>
                  <LinkActions link={link} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function StatusBadge({ link }: { link: { isActive: boolean; isExpired: boolean } }) {
  if (!link.isActive) return <Badge variant="secondary">Inativo</Badge>;
  if (link.isExpired) return <Badge variant="outline">Expirado</Badge>;
  return (
    <Badge className="bg-ada-orange-soft-2 text-ada-orange-dark border-transparent" variant="outline">
      Ativo
    </Badge>
  );
}
