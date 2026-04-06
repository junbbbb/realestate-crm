import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const PIN = "0641";
const SECRET = "crm-auth-secret-2026";

function verifyToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return false;
  const expected = createHmac("sha256", SECRET).update(ts + PIN).digest("hex").slice(0, 16);
  return sig === expected;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 로그인 페이지, API, 정적 파일은 통과
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".woff2")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("crm-auth")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
