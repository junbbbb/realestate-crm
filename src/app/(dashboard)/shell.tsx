"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCollectionStore } from "@/lib/collection-store";
import { useAuthStore } from "@/runtime/stores/auth-store";
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

function OfficeName() {
  const user = useAuthStore((s) => s.user);
  const officeName = user?.user_metadata?.office_name;
  if (!officeName) return null;
  return (
    <div className="mt-2.5 pt-2 border-t border-sidebar-border">
      <p className="text-sm font-semibold text-sidebar-foreground truncate">{officeName}</p>
    </div>
  );
}

function OfficeNamePrompt() {
  const user = useAuthStore((s) => s.user);
  const userId = useAuthStore((s) => s.userId);
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (user && !user.user_metadata?.office_name) {
      setShow(true);
    }
  }, [user]);

  if (!show) return null;

  async function handleSave() {
    if (!name.trim()) return;
    const { createSupabaseBrowserClient } = await import("@/lib/supabase-auth");
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.updateUser({ data: { office_name: name.trim() } });
    // Refresh auth state
    const { data: { user: updated } } = await supabase.auth.getUser();
    if (updated) useAuthStore.getState().setAuth(updated.id, updated);
    setShow(false);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[340px] p-6 space-y-4">
        <div className="text-center">
          <img src="/logo.svg" alt="Best Mountain" className="h-12 mx-auto mb-2" />
          <h2 className="text-lg font-bold">환영합니다!</h2>
          <p className="text-sm text-muted-foreground mt-1">중개소 이름을 입력해주세요</p>
        </div>
        <input
          autoFocus
          placeholder="예: 베스트공인중개"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="w-full h-10 rounded-lg border px-3 text-sm outline-none focus:ring-1 focus:ring-[#000000]"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full h-10 rounded-lg bg-foreground text-background font-medium disabled:opacity-40"
        >
          시작하기
        </button>
        <button
          onClick={() => setShow(false)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          나중에 할게요
        </button>
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const loadCollections = useCollectionStore((s) => s.loadCollections);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return <>
    <OfficeNamePrompt />
    {children}
  </>;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <AuthProvider>
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Sidebar: hidden on mobile, icon-only on md, full on xl+ */}
        <aside className="hidden md:flex shrink-0 bg-sidebar border-r border-sidebar-border flex-col w-14 xl:w-56 transition-all duration-200">
          <div className="p-3 xl:p-6">
            <Link href="/" className="text-sidebar-foreground">
              <div className="hidden xl:block">
                <div className="flex items-center gap-1.5">
                  <img src="/logo.svg" alt="Best Mountain" className="h-5 w-5 object-contain" />
                  <span className="text-sm tracking-wider" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900 }}>BEST MOUNTAIN</span>
                </div>
                <OfficeName />
              </div>
              <div className="xl:hidden flex items-center justify-center">
                <img src="/logo.svg" alt="Best Mountain" className="h-7 w-7 object-contain" />
              </div>
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
          <ShellInner>{children}</ShellInner>
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
