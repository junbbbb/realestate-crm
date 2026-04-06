export type PropertyType = "상가" | "건물" | "사무실" | "상가주택" | "상가건물" | "기타";
export type TradeStatus = "active" | "sold";
export type PriceChange = "none" | "increase" | "decrease" | "new";
export type DealType = "매매" | "전세" | "월세" | "단기임대";

export interface Tenant {
  name: string;
  business?: string;
  deposit: number;
  monthlyRent: number;
  contractEnd: string;
  floor: number;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  propertyType: PropertyType;
  dealType: DealType;
  realEstateTypeCode: string;  // 네이버 코드 (D02 등)
  tradeTypeCode: string;       // 네이버 코드 (B2 등)
  price: number;
  deposit?: number;
  monthlyRent?: number;
  premiumKey?: number; // 권리금 (만원)
  area: number;           // 대표 면적 (필터링 기준)
  areaLabel: string;      // 면적 표시 텍스트
  rooms: number;
  bathrooms: number;
  floor?: number;
  totalFloors?: number;
  description: string;
  isFavorite: boolean;
  isMyListing: boolean;
  createdAt: string;
  contact?: string;
  sourceUrl?: string;
  memo?: string;
  priceChange?: PriceChange;
  prevPrice?: number;
  features: string[];
  tenants?: Tenant[]; // 층별 임차인
  buildingMemo?: string; // 건물 메모 (수선 등)
  nearbyBusiness?: string; // 주변 업종 메모
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  memo: string;
  interestedIn: DealType[];
  budget: { min: number; max: number };
  preferredArea?: string;
  preferredFloor?: string; // 희망 층수: "1층", "지하", "2층 이상", "전체"
  businessType?: string; // 업종
  premiumBudget?: number; // 권리금 예산
  createdAt: string;
  history?: { date: string; note: string }[]; // 추천 히스토리
}

export interface CollectionEntry {
  propertyId: string;
  addedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  propertyIds: string[];
  entries?: CollectionEntry[];
  createdAt: string;
}

export interface PropertyFilters {
  search: string;
  dong: string[]; // [] = 전체, ["합정동","서교동"] = 선택된 동
  propertyType: PropertyType | "전체";
  dealType: DealType | "전체";
  areaMin: number;
  areaMax: number;
  priceMin: number;
  priceMax: number;
  rentMin: number;
  rentMax: number;
  floorFilter: "전체" | "1층" | "지하" | "2층 이상";
  source: "전체" | "네이버" | "개인매물";
  sortBy: "default" | "yield" | "price-asc" | "price-desc";
}
