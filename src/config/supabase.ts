import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// SSR 브라우저 클라이언트 — Google 로그인 세션 자동 포함
// 모든 repo가 이 클라이언트를 사용하므로 RLS가 auth.uid()를 인식
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
