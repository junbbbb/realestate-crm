import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const PIN = "0641";
const SECRET = "crm-auth-secret-2026";

function generateToken(): string {
  const ts = Date.now().toString();
  const sig = createHmac("sha256", SECRET).update(ts + PIN).digest("hex").slice(0, 16);
  return `${ts}.${sig}`;
}

export function verifyToken(token: string): boolean {
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  // 30일 만료
  if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return false;
  const expected = createHmac("sha256", SECRET).update(ts + PIN).digest("hex").slice(0, 16);
  return sig === expected;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.pin !== PIN) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const token = generateToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("crm-auth", token, {
    httpOnly: true,
    secure: false, // localhost
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30일
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("crm-auth");
  return res;
}
