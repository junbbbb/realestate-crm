"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollectionStore } from "@/lib/collection-store";
import {
  LayoutDashboard,
  Building2,
  Bookmark,
  FolderOpen,
  Users,
  Settings,
} from "lucide-react";
import { Toaster } from "@/components/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const nav = [
  { label: "대시보드", href: "/", icon: LayoutDashboard },
  { label: "매물 목록", href: "/properties", icon: Building2 },
  { label: "저장한 매물", href: "/favorites", icon: Bookmark },
  { label: "내 매물", href: "/my-listings", icon: FolderOpen },
  { label: "고객", href: "/customers", icon: Users },
  { label: "설정", href: "/settings", icon: Settings },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const loadCollections = useCollectionStore((s) => s.loadCollections);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen">
        {/* Sidebar: full on xl+, icon-only on smaller */}
        <aside className="shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col w-14 xl:w-56 transition-all duration-200">
          <div className="p-3 xl:p-6">
            <Link href="/" className="flex items-center gap-2 text-sidebar-foreground">
              <Building2 className="h-5 w-5 shrink-0" />
              <span className="text-lg font-bold tracking-tight hidden xl:block">부동산 CRM</span>
            </Link>
          </div>
          <nav className="flex-1 px-2 xl:px-3 space-y-1">
            {nav.map((n) => {
              const active = path === n.href;
              return (
                <Tooltip key={n.href}>
                  <TooltipTrigger
                    render={
                      <Link
                        href={n.href}
                        className={`flex items-center gap-3 rounded-lg px-2.5 xl:px-3 py-2.5 text-sm transition-colors justify-center xl:justify-start ${
                          active
                            ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                      />
                    }
                  >
                    <n.icon className="h-4 w-4 shrink-0" />
                    <span className="hidden xl:block">{n.label}</span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="xl:hidden">
                    {n.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 py-4 px-6 overflow-auto">
          <div>{children}</div>
        </main>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
