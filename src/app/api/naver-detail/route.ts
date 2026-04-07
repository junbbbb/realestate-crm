import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

const NAVER_COOKIE = process.env.NAVER_COOKIE ?? "";
const BASE = "https://fin.land.naver.com/front-api/v1/article";

const headers: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "accept-language": "ko,en-US;q=0.9,en;q=0.8",
  "content-type": "application/json",
  origin: "https://fin.land.naver.com",
  referer: "https://fin.land.naver.com/map",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  cookie: NAVER_COOKIE,
};

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

  if (!NAVER_COOKIE) {
    return NextResponse.json({ error: "NAVER_COOKIE not configured" }, { status: 500 });
  }

  try {
    const [basicRes, agentRes] = await Promise.all([
      fetch(
        `${BASE}/basicInfo?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`,
        { headers }
      ),
      fetch(`${BASE}/agent?articleNumber=${articleNumber}`, { headers }),
    ]);

    const basicText = await basicRes.text();
    const agentText = await agentRes.text();

    let basic, agent;
    try { basic = JSON.parse(basicText); } catch { basic = null; }
    try { agent = JSON.parse(agentText); } catch { agent = null; }

    return NextResponse.json({
      basicInfo: basic?.isSuccess ? basic.result : null,
      agentInfo: agent?.isSuccess ? agent.result : null,
    });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "fetch failed", detail: errMsg }, { status: 502 });
  }
}
