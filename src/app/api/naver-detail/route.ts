import { NextRequest, NextResponse } from "next/server";

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

    const basic = await basicRes.json();
    const agent = await agentRes.json();

    return NextResponse.json({
      basicInfo: basic.isSuccess ? basic.result : null,
      agentInfo: agent.isSuccess ? agent.result : null,
    });
  } catch (e) {
    console.error("Naver detail fetch error:", e);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
