export type PropertyType = "아파트" | "오피스텔" | "빌라" | "상가" | "사무실" | "건물" | "상가건물" | "토지" | "원룸" | "기타";
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
  price: number;
  deposit?: number;
  monthlyRent?: number;
  premiumKey?: number; // 권리금 (만원)
  area: number;
  rooms: number;
  bathrooms: number;
  floor?: number;
  totalFloors?: number;
  description: string;
  isFavorite: boolean;
  isMyListing: boolean;
  createdAt: string;
  contact?: string;
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

export interface PropertyFilters {
  search: string;
  dong: string; // "전체" or 동 이름
  propertyType: PropertyType | "전체";
  dealType: DealType | "전체";
  areaMin: number;
  areaMax: number;
  floorFilter: "전체" | "1층" | "지하" | "2층 이상";
  sortBy: "default" | "yield" | "price-asc" | "price-desc";
}
