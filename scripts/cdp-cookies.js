const http = require("http");

async function cdpSend(wsUrl, method, params = {}) {
  const WebSocket = (await import("ws")).default;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    ws.on("open", () => ws.send(JSON.stringify({ id, method, params })));
    ws.on("message", (data) => {
      const msg = JSON.parse(data);
      if (msg.id === id) { ws.close(); resolve(msg.result); }
    });
    ws.on("error", reject);
    setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 5000);
  });
}

async function main() {
  // Get page list
  const res = await fetch("http://localhost:9222/json/list");
  const pages = await res.json();
  const page = pages.find(p => p.type === "page");
  if (!page) { console.error("No page found"); return; }

  console.log("Page:", page.url);

  // Navigate to Naver
  console.log("Navigating to Naver...");
  await cdpSend(page.webSocketDebuggerUrl, "Page.navigate", { url: "https://fin.land.naver.com/map" });
  await new Promise(r => setTimeout(r, 8000));

  // Get cookies
  const cookieResult = await cdpSend(page.webSocketDebuggerUrl, "Network.getCookies", { urls: ["https://fin.land.naver.com"] });
  const cookies = cookieResult.cookies || [];
  console.log(`\nCookies (${cookies.length}):`);
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join("; ");
  cookies.forEach(c => console.log(`  ${c.name}=${c.value.slice(0, 50)}`));
  console.log("\nFull cookie string:");
  console.log(cookieStr);
}

main().catch(console.error);
