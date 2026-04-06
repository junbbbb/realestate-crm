"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

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
      </div>
    </div>
  );
}
