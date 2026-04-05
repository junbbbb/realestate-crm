/**
 * 네이버 부동산 크롤링 — 마포구 상가/건물
 * 비공식 API (m.land.naver.com)
 */

// 마포구 지역코드
const CORTARNO = "1144000000";
const REGION_NAME = "마포구";

// 상가/건물 매물 타입만
const PROPERTY_TYPES = [
  { code: "JGC", label: "상가" },   // 주거/상가 겸용 + 상가
  { code: "SG", label: "건물" },    // 상가건물
];

const DEAL_TYPES = [
  { code: "A1", label: "매매" },
  { code: "B1", label: "전세" },
  { code: "B2", label: "월세" },
];

const API_BASE = "https://m.land.naver.com/cluster/ajax/articleList";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://m.land.naver.com/",
  "Accept": "application/json",
};

const MAX_ITEMS = parseInt(process.argv[2] || "100", 10);

async function fetchPage(rletTpCd, tradTpCd, page) {
  const url = new URL(API_BASE);
  url.searchParams.set("cortarNo", CORTARNO);
  url.searchParams.set("rletTpCd", rletTpCd);
  url.searchParams.set("tradTpCd", tradTpCd);
  url.searchParams.set("z", "13");
  url.searchParams.set("lat", "37.5572");  // 마포구 중심 좌표
  url.searchParams.set("lon", "126.9236");
  url.searchParams.set("btm", "37.53");
  url.searchParams.set("lft", "126.89");
  url.searchParams.set("top", "37.58");
  url.searchParams.set("rgt", "126.96");
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), { headers: HEADERS });

  if (!res.ok) {
    console.error(`  HTTP ${res.status} for ${rletTpCd}/${tradTpCd} page ${page}`);
    return { articles: [], more: false };
  }

  const data = await res.json();
  const articles = data.body || [];
  const more = articles.length >= 20; // 20개면 다음 페이지 있을 수 있음

  return { articles, more };
}

function parseArticle(item, propertyLabel, dealLabel) {
  return {
    naverArticleId: String(item.atclNo || ""),
    title: item.atclNm || `${REGION_NAME} ${propertyLabel}`,
    address: item.rltrNm || REGION_NAME,
    price: Number(item.prc) || 0,
    priceText: item.hanPrc || `${item.prc}만원`,
    deposit: Number(item.warPrc) || undefined,
    monthlyRent: Number(item.rentPrc) || undefined,
    area: Number(item.spc2) || 0,
    areaText: item.spc2 ? `${item.spc2}m²` : "정보없음",
    floor: item.flrInfo || "",
    propertyType: propertyLabel,
    dealType: dealLabel,
    description: [
      item.atclCfmYmd ? `확인: ${item.atclCfmYmd}` : "",
      item.direction ? `방향: ${item.direction}` : "",
    ].filter(Boolean).join(" / ") || "",
    sourceUrl: `https://m.land.naver.com/article/info/${item.atclNo}`,
    tags: [REGION_NAME, propertyLabel, dealLabel],
    createdAt: new Date().toISOString(),
  };
}

async function main() {
  console.log(`=== 네이버 부동산 크롤링 ===`);
  console.log(`지역: ${REGION_NAME} (${CORTARNO})`);
  console.log(`대상: ${PROPERTY_TYPES.map(p => p.label).join(", ")}`);
  console.log(`목표: ${MAX_ITEMS}건`);
  console.log("");

  const allItems = [];

  for (const pt of PROPERTY_TYPES) {
    for (const dt of DEAL_TYPES) {
      if (allItems.length >= MAX_ITEMS) break;

      let page = 1;
      let hasMore = true;

      while (hasMore && allItems.length < MAX_ITEMS) {
        console.log(`  ${pt.label}/${dt.label} page ${page}...`);

        const { articles, more } = await fetchPage(pt.code, dt.code, page);

        if (articles.length === 0) {
          console.log(`    → 결과 없음`);
          break;
        }

        for (const item of articles) {
          if (allItems.length >= MAX_ITEMS) break;
          allItems.push(parseArticle(item, pt.label, dt.label));
        }

        console.log(`    → ${articles.length}건 (누적 ${allItems.length}/${MAX_ITEMS})`);

        hasMore = more;
        page++;

        // Rate limiting
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }

  console.log("");
  console.log(`=== 완료: 총 ${allItems.length}건 ===`);

  // 결과를 JSON 파일로 저장
  const fs = await import("fs");
  const outPath = `data/crawled-${REGION_NAME}-${new Date().toISOString().split("T")[0]}.json`;

  // data 디렉토리 생성
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(allItems, null, 2), "utf-8");
  console.log(`저장: ${outPath}`);

  // 요약 출력
  const byType = {};
  const byDeal = {};
  for (const item of allItems) {
    byType[item.propertyType] = (byType[item.propertyType] || 0) + 1;
    byDeal[item.dealType] = (byDeal[item.dealType] || 0) + 1;
  }
  console.log("유형별:", byType);
  console.log("거래별:", byDeal);
}

main().catch(err => {
  console.error("크롤링 실패:", err.message);
  process.exit(1);
});
