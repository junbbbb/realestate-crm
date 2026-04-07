import { supabase } from "./supabase";

export interface NaverDetailInfo {
  // basicInfo - facilityInfo
  totalParkingCount?: number;
  isParkingPossible?: boolean;
  buildingConjunctionDate?: string;
  approvalElapsedYear?: number;
  heatingAndCoolingSystemType?: string;
  heatingEnergyType?: string;
  // basicInfo - spaceInfo
  bathRoomCount?: number;
  currentBusinessType?: string;
  recommendedBusinessType?: string;
  // basicInfo - articleDetailInfo
  buildingUse?: string;
  isIllegalBuilding?: boolean;
  articleDescription?: string;
  coordinates?: { xCoordinate: number; yCoordinate: number };
  // basicInfo - movingInInfo
  movingInType?: string;
  movingInNegotiation?: boolean;
  // basicInfo - sizeInfo
  pyeongArea?: number;
  // basicInfo - priceInfo
  loan?: number;
  // agentInfo
  brokerageName?: string;
  brokerName?: string;
  agentAddress?: string;
  businessRegistrationNumber?: string;
  phoneBrokerage?: string;
  phoneMobile?: string;
  profileImageUrl?: string;
}

const cache = new Map<string, { data: NaverDetailInfo; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 200;
const DB_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

async function getDbCache(articleNumber: string): Promise<NaverDetailInfo | null> {
  try {
    const result = await Promise.race([
      supabase
        .from("naver_detail_cache")
        .select("data, fetched_at")
        .eq("article_number", articleNumber)
        .single(),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 2000)),
    ]);
    const { data } = result;
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > DB_CACHE_TTL) return null;
    return data.data as NaverDetailInfo;
  } catch {
    return null;
  }
}

async function setDbCache(articleNumber: string, detail: NaverDetailInfo): Promise<void> {
  try {
    await supabase
      .from("naver_detail_cache")
      .upsert({ article_number: articleNumber, data: detail, fetched_at: new Date().toISOString() });
  } catch (e) {
    console.warn("setDbCache failed:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    if (!json.basicInfo && !json.agentInfo) throw new Error("empty");
    return json;
  } finally {
    clearTimeout(timer);
  }
}

const ENDPOINTS = [
  { base: "/api/naver-proxy", timeout: 12000 },
  { base: "http://localhost:4000/naver-detail", timeout: 3000 },
  { base: "/api/naver-detail", timeout: 10000 },
];

export async function fetchNaverDetail(
  articleNumber: string,
  realEstateType: string,
  tradeType: string,
  options?: { skipCache?: boolean }
): Promise<NaverDetailInfo | null> {
  if (!options?.skipCache) {
    const cached = cache.get(articleNumber);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    // DB 캐시 확인 (24시간 유효)
    const dbCached = await getDbCache(articleNumber);
    if (dbCached) {
      cache.set(articleNumber, { data: dbCached, ts: Date.now() });
      return dbCached;
    }
  }

  // Fallback 순서: Python proxy → 로컬 프록시 → 서버 API
  let json;
  const params = `articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`;
  for (const ep of ENDPOINTS) {
    try {
      json = await fetchWithTimeout(`${ep.base}?${params}`, ep.timeout);
      break;
    } catch { continue; }
  }
  if (!json) return null;

  try {
    const basic = json.basicInfo;
    const agent = json.agentInfo;

    const detail: NaverDetailInfo = {};

    if (basic) {
      const facility = basic.detailInfo?.facilityInfo;
      const space = basic.detailInfo?.spaceInfo;
      const article = basic.detailInfo?.articleDetailInfo;
      const moving = basic.detailInfo?.movingInInfo;
      const size = basic.detailInfo?.sizeInfo;
      const price = basic.priceInfo;

      if (facility) {
        detail.totalParkingCount = facility.totalParkingCount;
        detail.isParkingPossible = facility.isParkingPossible;
        detail.buildingConjunctionDate = facility.buildingConjunctionDate;
        detail.approvalElapsedYear = facility.approvalElapsedYear;
        detail.heatingAndCoolingSystemType = facility.heatingAndCoolingSystemType;
        detail.heatingEnergyType = facility.heatingEnergyType;
      }
      if (space) {
        detail.bathRoomCount = space.bathRoomCount;
        detail.currentBusinessType = space.currentBusinessType;
        detail.recommendedBusinessType = space.recommendedBusinessType;
      }
      if (article) {
        detail.buildingUse = article.buildingUse;
        detail.isIllegalBuilding = article.isIllegalBuilding;
        detail.articleDescription = article.articleDescription;
        detail.coordinates = article.coordinates;
      }
      if (moving) {
        detail.movingInType = moving.movingInType;
        detail.movingInNegotiation = moving.movingInNegotiation;
      }
      if (size) {
        detail.pyeongArea = size.pyeongArea;
      }
      if (price) {
        detail.loan = price.loan;
      }
    }

    if (agent) {
      detail.brokerageName = agent.brokerageName;
      detail.brokerName = agent.brokerName;
      detail.agentAddress = agent.address;
      detail.businessRegistrationNumber = agent.businessRegistrationNumber;
      detail.phoneBrokerage = agent.phone?.brokerage;
      detail.phoneMobile = agent.phone?.mobile;
      detail.profileImageUrl = agent.profileImageUrl;
    }

    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(articleNumber, { data: detail, ts: Date.now() });
    setDbCache(articleNumber, detail);
    return detail;
  } catch (e) {
    console.error("fetchNaverDetail error:", e);
    return null;
  }
}

const HEATING_TYPES: Record<string, string> = {
  HT001: "개별난방", HT002: "중앙난방", HT003: "지역난방",
};
const HEATING_ENERGY: Record<string, string> = {
  HF001: "도시가스", HF002: "LPG", HF003: "등유", HF004: "전기", HF005: "연탄",
};
const MOVING_IN_TYPES: Record<string, string> = {
  MV001: "즉시 입주", MV002: "날짜 협의", MV003: "날짜 지정",
};

export function formatHeating(code?: string): string {
  return code ? HEATING_TYPES[code] ?? code : "—";
}
export function formatHeatingEnergy(code?: string): string {
  return code ? HEATING_ENERGY[code] ?? code : "—";
}
export function formatMovingIn(info: NaverDetailInfo): string {
  if (info.movingInNegotiation) return "협의 가능";
  return info.movingInType ? MOVING_IN_TYPES[info.movingInType] ?? info.movingInType : "—";
}
export function formatApprovalDate(date?: string): string {
  if (!date || date.length < 8) return "—";
  return `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
}
