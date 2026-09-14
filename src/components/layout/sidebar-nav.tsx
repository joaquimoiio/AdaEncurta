"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Link2, Megaphone, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/links", label: "Links", icon: Link2 },
  { href: "/admin/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
