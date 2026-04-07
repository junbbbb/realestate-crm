import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Shell from "./shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // PIN 인증 체크
  const cookieStore = await cookies();
  const token = cookieStore.get("crm-auth")?.value;
  const pinOk = token && verifyToken(token);

  // Supabase Auth 체크 (Google 로그인 등)
  let supabaseOk = false;
  if (!pinOk) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    supabaseOk = !!user;
  }

  if (!pinOk && !supabaseOk) {
    redirect("/login");
  }

  return <Shell>{children}</Shell>;
}
