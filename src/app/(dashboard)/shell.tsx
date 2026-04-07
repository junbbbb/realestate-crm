"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollectionStore } from "@/lib/collection-store";
import { AuthProvider } from "@/runtime/providers/auth-provider";
import {
  LayoutDashboard,
  Building2,
  Bookmark,
  Handshake,
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
  { label: "거래 관리", href: "/my-listings", icon: Handshake },
  { label: "고객", href: "/customers", icon: Users },
  { label: "설정", href: "/settings", icon: Settings },
];

const mobileNav = nav.filter((n) => n.href !== "/my-listings");

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const loadCollections = useCollectionStore((s) => s.loadCollections);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <AuthProvider>
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Sidebar: hidden on mobile, icon-only on md, full on xl+ */}
        <aside className="hidden md:flex shrink-0 bg-sidebar border-r border-sidebar-border flex-col w-14 xl:w-56 transition-all duration-200">
          <div className="p-3 xl:p-6">
            <Link href="/" className="flex items-center gap-2.5 text-sidebar-foreground">
              <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center shrink-0">
                <span className="text-background text-lg font-black">B</span>
              </div>
              <span className="hidden xl:block text-base font-extrabold tracking-tight">베스트공인중개</span>
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
        <main className="flex-1 py-4 px-4 md:px-6 overflow-auto pb-20 md:pb-4">
          <div>{children}</div>
        </main>
        <Toaster />

        {/* Mobile bottom tab navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t border-border">
          <div className="flex items-center justify-around px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            {mobileNav.map((n) => {
              const active = path === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1 rounded-lg transition-colors ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <n.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                  <span className={`text-[10px] leading-tight truncate ${active ? "font-semibold" : ""}`}>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </TooltipProvider>
    </AuthProvider>
  );
}
