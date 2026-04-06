"use client";

import { useToastStore } from "@/lib/toast-store";
import { CheckCircle } from "lucide-react";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm animate-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          {t.message}
        </div>
      ))}
    </div>
  );
}
