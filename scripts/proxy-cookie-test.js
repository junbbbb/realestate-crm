const puppeteer = require("puppeteer");

const PROXY = "gate.decodo.com:10001";
const PROXY_USER = "user-spo8xtbujk-sessionduration-60-asn-17598";
const PROXY_PASS = "jxjt2UHax48y9VLq_e";

(async () => {
  console.log("1. Launching browser...");
  const browser = await puppeteer.launch({
    headless: false,
    args: [`--proxy-server=http://${PROXY}`, "--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36");

  console.log("2. Going to Naver Land...");
  try {
    await page.goto("https://fin.land.naver.com/map", { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (e) {
    console.log("Navigation error:", e.message);
  }

  await new Promise(r => setTimeout(r, 8000));

  const url = page.url();
  const title = await page.title();
  console.log("URL:", url);
  console.log("Title:", title);

  const cookies = await page.cookies();
  console.log("Cookies:", cookies.length);
  cookies.forEach(c => console.log(`  ${c.name}=${c.value.slice(0, 40)}`));

  if (cookies.length > 0) {
    console.log("\n3. Testing API...");
    const result = await page.evaluate(async () => {
      try {
        const res = await fetch("/front-api/v1/article/basicInfo?articleNumber=2518888640&realEstateType=DDDGG&tradeType=B1");
        return { status: res.status, body: await res.text() };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log("API:", JSON.stringify(result).slice(0, 500));
  }

  console.log("\nBrowser stays open 30s for inspection...");
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
})();
