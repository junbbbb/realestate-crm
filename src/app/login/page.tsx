"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setPin("");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-[320px] space-y-6">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-4">
            <span className="text-background text-3xl font-black">B</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">베스트공인중개</h1>
          <p className="text-sm text-muted-foreground mt-2">당신의 한 통화가 누군가의 새 시작이 됩니다</p>
          <p className="text-xs text-muted-foreground mt-3">비밀번호를 입력하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                  pin.length > i
                    ? "border-primary bg-primary/5"
                    : error
                    ? "border-red-400"
                    : "border-border"
                }`}
              >
                {pin[i] ? "●" : ""}
              </div>
            ))}
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(v);
              setError(false);
            }}
            className="sr-only"
            autoFocus
          />

          {/* 숫자 키패드 */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((key, i) => {
              if (key === null) return <div key={i} />;
              return (
                <button
                  key={i}
                  type="button"
                  className="h-12 rounded-lg bg-card border text-lg font-medium hover:bg-accent transition-colors active:scale-95"
                  onClick={() => {
                    if (key === "del") {
                      setPin((p) => p.slice(0, -1));
                    } else {
                      setPin((p) => {
                        const next = (p + key).slice(0, 4);
                        return next;
                      });
                    }
                    setError(false);
                  }}
                >
                  {key === "del" ? "←" : key}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-center text-sm text-red-500">비밀번호가 틀렸습니다</p>
          )}

          <button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">또는</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google 로그인 */}
        <button
          type="button"
          onClick={async () => {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });
          }}
          className="w-full h-11 rounded-lg border bg-card font-medium transition-colors hover:bg-accent flex items-center justify-center gap-2 text-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 계속하기
        </button>
      </div>
    </div>
  );
}
