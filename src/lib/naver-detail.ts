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

const NAVER_BASE = "https://fin.land.naver.com/front-api/v1/article";

async function fetchViaServer(articleNumber: string, realEstateType: string, tradeType: string) {
  const url = `/api/naver-detail?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5초 timeout
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`server ${res.status}`);
    const json = await res.json();
    // 서버에서 데이터를 못 가져온 경우 (네이버 차단 등)
    if (!json.basicInfo && !json.agentInfo) throw new Error("empty response");
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDirectFromClient(articleNumber: string, realEstateType: string, tradeType: string) {
  const [basicRes, agentRes] = await Promise.all([
    fetch(`${NAVER_BASE}/basicInfo?articleNumber=${articleNumber}&realEstateType=${realEstateType}&tradeType=${tradeType}`),
    fetch(`${NAVER_BASE}/agent?articleNumber=${articleNumber}`),
  ]);
  const basic = await basicRes.json();
  const agent = await agentRes.json();
  return {
    basicInfo: basic.isSuccess ? basic.result : null,
    agentInfo: agent.isSuccess ? agent.result : null,
  };
}

export async function fetchNaverDetail(
  articleNumber: string,
  realEstateType: string,
  tradeType: string
): Promise<NaverDetailInfo | null> {
  const cached = cache.get(articleNumber);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let json;
  try {
    // 1차: 서버 API route
    json = await fetchViaServer(articleNumber, realEstateType, tradeType);
  } catch {
    try {
      // 2차: 클라이언트 직접 호출 (CORS 테스트 모드)
      json = await fetchDirectFromClient(articleNumber, realEstateType, tradeType);
      console.log("[naver-detail] direct client fetch succeeded");
    } catch (e) {
      console.error("[naver-detail] both server and client fetch failed", e);
      return null;
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
