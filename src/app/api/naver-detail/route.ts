import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const CLOUD_PROXY = "http://168.107.9.180:4000/naver-detail";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("crm-auth")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const articleNumber = req.nextUrl.searchParams.get("articleNumber");
  const realEstateType = req.nextUrl.searchParams.get("realEstateType");
  const tradeType = req.nextUrl.searchParams.get("tradeType");

  if (!articleNumber || !realEstateType || !tradeType) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  try {
    const url = `${CLOUD_PROXY}?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "proxy failed", detail: errMsg }, { status: 502 });
  }
}
