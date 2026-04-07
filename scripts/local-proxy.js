/**
 * 로컬 CORS 프록시 — 네이버 부동산 API용
 *
 * Vercel 배포판에서 네이버 API 호출 시 사용.
 * 사용자 PC (한국 IP)에서 실행하면 네이버 차단 + CORS 문제 해결.
 *
 * 실행: npm run proxy  또는  node scripts/local-proxy.js
 */

const http = require("http");
const https = require("https");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const PORT = 4000;
const NAVER_BASE = "https://fin.land.naver.com/front-api/v1/article";

// .env.local에서 쿠키 읽기
let NAVER_COOKIE = "";
try {
  const envPath = resolve(__dirname, "..", ".env.local");
  const env = readFileSync(envPath, "utf-8");
  const match = env.match(/^NAVER_COOKIE=(.+)$/m);
  if (match) NAVER_COOKIE = match[1].trim();
} catch {}

if (!NAVER_COOKIE) {
  console.error("NAVER_COOKIE not found in .env.local");
  process.exit(1);
}

function proxyToNaver(naverUrl) {
  return new Promise((resolve, reject) => {
    const req = https.get(naverUrl, {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "ko,en-US;q=0.9,en;q=0.8",
        "content-type": "application/json",
        origin: "https://fin.land.naver.com",
        referer: "https://fin.land.naver.com/map",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        cookie: NAVER_COOKIE,
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/naver-detail") {
    const articleNumber = url.searchParams.get("articleNumber");
    const realEstateType = url.searchParams.get("realEstateType");
    const tradeType = url.searchParams.get("tradeType");

    if (!articleNumber || !realEstateType || !tradeType) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "missing params" }));
      return;
    }

    try {
      const [basic, agent] = await Promise.all([
        proxyToNaver(`${NAVER_BASE}/basicInfo?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`),
        proxyToNaver(`${NAVER_BASE}/agent?articleNumber=${articleNumber}`),
      ]);

      let basicJson, agentJson;
      try { basicJson = JSON.parse(basic.data); } catch { basicJson = null; }
      try { agentJson = JSON.parse(agent.data); } catch { agentJson = null; }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        basicInfo: basicJson?.isSuccess ? basicJson.result : null,
        agentInfo: agentJson?.isSuccess ? agentJson.result : null,
      }));
    } catch (e) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, cookieLen: NAVER_COOKIE.length }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\n  🟢 네이버 API 프록시 실행 중: http://localhost:${PORT}`);
  console.log(`  쿠키 길이: ${NAVER_COOKIE.length}자`);
  console.log(`  종료: Ctrl+C\n`);
});
