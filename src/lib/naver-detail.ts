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
const DB_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

async function getDbCache(articleNumber: string): Promise<NaverDetailInfo | null> {
  try {
    const { data } = await supabase
      .from("naver_detail_cache")
      .select("data, fetched_at")
      .eq("article_number", articleNumber)
      .single();
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
  } catch {}
}

const LOCAL_PROXY = "http://localhost:4000/naver-detail";

async function fetchViaPythonProxy(articleNumber: string, realEstateType: string, tradeType: string) {
  const url = `/api/naver-proxy?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`python proxy ${res.status}`);
    const json = await res.json();
    if (!json.basicInfo && !json.agentInfo) throw new Error("empty");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchViaLocalProxy(articleNumber: string, realEstateType: string, tradeType: string) {
  const url = `${LOCAL_PROXY}?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`proxy ${res.status}`);
    const json = await res.json();
    if (!json.basicInfo && !json.agentInfo) throw new Error("empty");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchViaServer(articleNumber: string, realEstateType: string, tradeType: string) {
  const url = `/api/naver-detail?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`server ${res.status}`);
    const json = await res.json();
    if (!json.basicInfo && !json.agentInfo) throw new Error("empty response");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNaverDetail(
  articleNumber: string,
  realEstateType: string,
  tradeType: string
): Promise<NaverDetailInfo | null> {
  const cached = cache.get(articleNumber);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // DB 캐시 확인 (24시간 유효)
  const dbCached = await getDbCache(articleNumber);
  if (dbCached) {
    cache.set(articleNumber, { data: dbCached, ts: Date.now() });
    return dbCached;
  }

  let json;
  try {
    // 1차: Python API (curl_cffi Chrome 위장)
    json = await fetchViaPythonProxy(articleNumber, realEstateType, tradeType);
  } catch {
    try {
      // 2차: 로컬 프록시 (사무실 PC, 주거용 한국 IP)
      json = await fetchViaLocalProxy(articleNumber, realEstateType, tradeType);
    } catch {
      try {
        // 3차: 서버 API route
        json = await fetchViaServer(articleNumber, realEstateType, tradeType);
      } catch {
        return null;
      }
    }
  }

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
