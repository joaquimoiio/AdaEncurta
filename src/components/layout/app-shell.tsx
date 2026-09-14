"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { AdaLogo } from "@/components/brand/ada-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AppShell({ children, shortBaseHost }: { children: React.ReactNode; shortBaseHost: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <AdaLogo className="h-8" />
            <span className="rounded-md bg-ada-orange-soft-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ada-orange-dark">
              Encurta
            </span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col gap-6 p-4">
          <Button asChild className="w-full justify-start">
            <Link href="/admin/links/novo">
              <Plus data-icon="inline-start" />
              Novo link
            </Link>
          </Button>
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground/80">Domínio dos links</p>
          <p className="truncate font-mono">{shortBaseHost}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile / tablet */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-16 items-center border-b px-6">
                <AdaLogo className="h-8" />
              </div>
              <div className="flex flex-col gap-6 p-4">
                <Button asChild className="w-full justify-start" onClick={() => setOpen(false)}>
                  <Link href="/admin/links/novo">
                    <Plus data-icon="inline-start" />
                    Novo link
                  </Link>
                </Button>
                <SidebarNav onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/admin" className="flex items-center gap-2">
            <AdaLogo className="h-7" />
          </Link>
          <div className="ml-auto">
            <Button asChild size="sm">
              <Link href="/admin/links/novo">
                <Plus data-icon="inline-start" />
                Novo
              </Link>
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full min-w-0 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
