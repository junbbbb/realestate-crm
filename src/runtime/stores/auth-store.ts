import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  userId: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (userId: string | null, user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  user: null,
  isLoading: true,
  setAuth: (userId, user) => set({ userId, user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
