"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";
import { useAuthStore } from "@/runtime/stores/auth-store";
import { PIN_USER_ID } from "@/config/constants";

/**
 * AuthProvider — resolves the current user on mount.
 *
 * Priority:
 *   1. Supabase Auth session (Google login) -> userId = auth.uid()
 *   2. PIN cookie present (verified server-side by layout) -> userId = "pin-user"
 *
 * The dashboard layout already gate-keeps unauthenticated users,
 * so if we reach this component at least one auth method succeeded.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          // Google / Supabase Auth user
          setAuth(user.id, user);
        } else {
          // PIN-authenticated user (single-user fallback)
          setAuth(PIN_USER_ID, null);
        }
      } catch {
        if (!cancelled) {
          // Fallback — treat as PIN user so the app still works
          setAuth(PIN_USER_ID, null);
        }
      }
    }

    resolve();

    // Listen for auth state changes (e.g. sign-out in another tab)
    const supabase = createSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setAuth(session.user.id, session.user);
      } else {
        setAuth(PIN_USER_ID, null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return <>{children}</>;
}

/**
 * Hook to read current auth state from anywhere in the component tree.
 */
export function useAuth() {
  return useAuthStore((s) => ({
    userId: s.userId,
    user: s.user,
    isLoading: s.isLoading,
  }));
}
