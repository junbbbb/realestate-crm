"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { formatPrice, formatMoney } from "@/lib/format";
import { Property, PropertyType, DealType } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Heart, Search, RotateCcw, Inbox, X, MapPin, Ruler, BedDouble, Building, Phone,
  TrendingUp, Store, Users, FileText, BarChart3, Scale, Calculator, Plus,
} from "lucide-react";

const propertyTypes: (PropertyType | "전체")[] = ["전체", "아파트", "오피스텔", "빌라", "상가", "토지", "원룸"];
const dealTypes: (DealType | "전체")[] = ["전체", "매매", "전세", "월세"];
const floorOptions = ["전체", "1층", "지하", "2층 이상"] as const;
const sortOptions = [
  { value: "default", label: "기본" },
  { value: "yield", label: "수익률순" },
  { value: "price-asc", label: "가격 낮은순" },
  { value: "price-desc", label: "가격 높은순" },
];

function getYield(p: Property): number | null {
  if (p.dealType === "월세" && p.monthlyRent && p.deposit && p.deposit > 0) {
    return (p.monthlyRent * 12) / p.deposit * 100;
  }
  return null;
}

/* ── Cost Simulator ── */
function CostSimulator({ property }: { property: Property }) {
  const [premium, setPremium] = useState(property.premiumKey ?? 0);
  const [interior, setInterior] = useState(0);

  const deposit = property.deposit ?? 0;
  const monthly = property.monthlyRent ?? 0;
  const total = premium + deposit + interior;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Calculator className="h-4 w-4 text-muted-foreground" />비용 시뮬레이션
      </div>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">권리금 (만원)</p>
            <Input type="number" className="h-8 text-sm bg-card" value={premium || ""} onChange={(e) => setPremium(Number(e.target.value) || 0)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">보증금 (만원)</p>
            <Input type="number" className="h-8 text-sm bg-card" value={deposit} readOnly />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">인테리어 (만원)</p>
            <Input type="number" className="h-8 text-sm bg-card" value={interior || ""} onChange={(e) => setInterior(Number(e.target.value) || 0)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">월세 (만원)</p>
            <Input type="number" className="h-8 text-sm bg-card" value={monthly} readOnly />
          </div>
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">초기 투자금 합계</span>
          <span className="font-bold text-base">{formatMoney(total)}</span>
        </div>
        {monthly > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">월 고정 비용</span>
            <span className="font-semibold">{monthly}만/월</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Detail Panel ── */
function DetailPanel({ property, onClose }: { property: Property; onClose: () => void }) {
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const { containerRef, thumbRef } = useScrollReveal<HTMLDivElement>();
  const [tab, setTab] = useState<"info" | "area" | "legal" | "cost">("info");

  const yieldRate = getYield(property);

  const tabs = [
    { id: "info" as const, label: "기본" },
    { id: "area" as const, label: "상권" },
    { id: "legal" as const, label: "권리" },
    { id: "cost" as const, label: "비용" },
  ];

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="bg-card border rounded-lg h-full overflow-y-auto">
      {/* Custom scrollbar thumb */}
      <div
        ref={thumbRef}
        className="absolute right-1 w-1.5 rounded-full bg-foreground/15 opacity-0 transition-opacity duration-300 pointer-events-none z-10"
        style={{ top: 0, height: 0 }}
      />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex gap-2">
              <Badge className="bg-primary text-primary-foreground text-xs">{property.dealType}</Badge>
              <Badge variant="outline" className="text-xs">{property.propertyType}</Badge>
            </div>
            <h2 className="text-xl font-bold mt-2">{property.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleFavorite(property.id)}>
              <Heart className={`h-5 w-5 ${property.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"} transition-colors`} />
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Price + Yield */}
        <div className="bg-secondary rounded-lg p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">가격</p>
              <p className="text-3xl font-bold">{formatPrice(property)}</p>
            </div>
            {yieldRate && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">연 수익률</p>
                <p className="text-2xl font-bold text-green-600">{yieldRate.toFixed(1)}%</p>
              </div>
            )}
          </div>
          {property.premiumKey && (
            <p className="text-sm text-muted-foreground mt-2">권리금: {formatMoney(property.premiumKey)}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 text-xs font-medium py-2 rounded-md transition-colors ${
                tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: 기본 */}
        {tab === "info" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">면적</p>
                <p className="text-sm font-medium flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-muted-foreground" />{property.area}m²</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">방/욕실</p>
                <p className="text-sm font-medium flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-muted-foreground" />{property.rooms}방 {property.bathrooms}욕실</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">층</p>
                <p className="text-sm font-medium flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-muted-foreground" />{property.floor ? `${property.floor}/${property.totalFloors}층` : "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">등록일</p>
                <p className="text-sm font-medium">{property.createdAt}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">주소</p>
              <p className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{property.address}</p>
            </div>
            <div className="rounded-lg bg-secondary border border-border h-[140px] flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">지도 연동 예정</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">설명</p>
              <p className="text-sm leading-relaxed">{property.description}</p>
            </div>
            {property.features.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">특징</p>
                <div className="flex flex-wrap gap-1.5">
                  {property.features.map((f) => (<Badge key={f} variant="secondary" className="text-xs">{f}</Badge>))}
                </div>
              </div>
            )}
            {property.contact && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">연락처</p>
                <p className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{property.contact}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: 상권 */}
        {tab === "area" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><Users className="h-4 w-4 text-muted-foreground" />유동인구</div>
              <div className="rounded-lg bg-secondary border h-[100px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">유동인구 데이터 연동 예정</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><Store className="h-4 w-4 text-muted-foreground" />주변 상권 / 업종 분포</div>
              <div className="rounded-lg border p-3">
                <textarea placeholder="주변 업종 메모 (카페 밀집, 음식점 포화 등)..." defaultValue={property.nearbyBusiness ?? ""} className="w-full text-sm bg-transparent resize-none h-[60px] focus:outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><BarChart3 className="h-4 w-4 text-muted-foreground" />공실률</div>
              <div className="rounded-lg bg-secondary border h-[80px] flex items-center justify-center">
                <p className="text-xs text-muted-foreground">공실률 데이터 연동 예정</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><TrendingUp className="h-4 w-4 text-muted-foreground" />개발 호재</div>
              <div className="rounded-lg border p-3">
                <textarea placeholder="재개발, 신규 역, GTX, 도로 확장 등..." className="w-full text-sm bg-transparent resize-none h-[60px] focus:outline-none placeholder:text-muted-foreground" />
              </div>
            </div>
          </div>
        )}

        {/* Tab: 권리 */}
        {tab === "legal" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><FileText className="h-4 w-4 text-muted-foreground" />등기부등본</div>
              <div className="rounded-lg border p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">소유자</p>
                    <Input placeholder="소유자명" className="h-8 text-sm bg-card" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">열람일</p>
                    <Input type="date" className="h-8 text-sm bg-card" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">근저당/가압류</p>
                  <Input placeholder="근저당 금액, 가압류 여부" className="h-8 text-sm bg-card" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">메모</p>
                  <textarea placeholder="등기부 관련 메모..." className="w-full text-sm bg-transparent border rounded-md p-2 resize-none h-[50px] focus:outline-none placeholder:text-muted-foreground" />
                </div>
              </div>
            </div>

            <Separator />

            {/* 층별 임차인 현황 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-medium"><Users className="h-4 w-4 text-muted-foreground" />임차인 현황</div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"><Plus className="h-3 w-3 mr-1" />추가</Button>
              </div>
              {property.tenants && property.tenants.length > 0 ? (
                <div className="space-y-2">
                  {property.tenants.map((t, i) => (
                    <div key={i} className="rounded-lg border p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{t.floor}층 — {t.name}</span>
                        <span className="text-muted-foreground">{t.business}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>보증금 {formatMoney(t.deposit)} / 월 {t.monthlyRent}만</span>
                        <span>만기 {t.contractEnd}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">임차인/업종</p>
                      <Input placeholder="예: 카페 OO" className="h-8 text-sm bg-card" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">층</p>
                      <Input type="number" placeholder="1" className="h-8 text-sm bg-card" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">보증금/월세 (만원)</p>
                      <Input placeholder="5000 / 200" className="h-8 text-sm bg-card" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">계약 만기</p>
                      <Input type="date" className="h-8 text-sm bg-card" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 건물 메모 */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><Building className="h-4 w-4 text-muted-foreground" />건물 메모</div>
              <textarea placeholder="수선 필요 사항, 건물 상태, 주차 공간 등..." defaultValue={property.buildingMemo ?? ""} className="w-full text-sm border rounded-md p-3 resize-none h-[80px] focus:outline-none placeholder:text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Tab: 비용 */}
        {tab === "cost" && (
          <div className="space-y-5">
            <CostSimulator property={property} />

            <Separator />

            {/* 실거래가 비교 placeholder */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium"><TrendingUp className="h-4 w-4 text-muted-foreground" />실거래가 비교</div>
              <div className="rounded-lg bg-secondary border h-[120px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">국토부 실거래가 API 연동 예정</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/* ── Compare View ── */
function CompareView({ properties, onClose }: { properties: Property[]; onClose: () => void }) {
  const labels = ["매물명", "유형", "거래", "가격", "권리금", "수익률", "면적", "방/욕실", "층", "주소", "특징"];
  const toggleCompare = useStore((s) => s.toggleCompare);

  return (
    <div className="bg-card rounded-lg border overflow-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4" />
          <h3 className="font-semibold text-sm">매물 비교 ({properties.length}건)</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-20" />
          {Array.from({ length: 5 }).map((_, i) => (
            <col key={i} />
          ))}
        </colgroup>
        <tbody>
          <tr className="border-b">
            <td className="p-2 bg-secondary" />
            {Array.from({ length: 5 }).map((_, i) => {
              const p = properties[i];
              if (!p) return <td key={i} className="p-2 border-l" />;
              return (
                <td key={p.id} className="p-2 border-l text-right">
                  <button
                    onClick={() => toggleCompare(p.id)}
                    className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="비교에서 제거"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              );
            })}
          </tr>
          {labels.map((label) => (
            <tr key={label} className="border-b last:border-b-0">
              <td className="p-3 font-medium text-muted-foreground bg-secondary whitespace-nowrap">{label}</td>
              {Array.from({ length: 5 }).map((_, i) => {
                const p = properties[i];
                if (!p) return <td key={i} className="p-3 border-l" />;
                const y = getYield(p);
                return (
                  <td key={p.id} className="p-3 border-l">
                    {label === "매물명" && <span className="font-medium">{p.title}</span>}
                    {label === "유형" && p.propertyType}
                    {label === "거래" && p.dealType}
                    {label === "가격" && <span className="font-semibold">{formatPrice(p)}</span>}
                    {label === "권리금" && (p.premiumKey ? formatMoney(p.premiumKey) : "—")}
                    {label === "수익률" && (y ? <span className="text-green-600 font-medium">{y.toFixed(1)}%</span> : "—")}
                    {label === "면적" && `${p.area}m²`}
                    {label === "방/욕실" && `${p.rooms}방 ${p.bathrooms}욕실`}
                    {label === "층" && (p.floor ? `${p.floor}/${p.totalFloors}F` : "—")}
                    {label === "주소" && <span className="text-muted-foreground">{p.address}</span>}
                    {label === "특징" && (
                      <div className="flex flex-wrap gap-1">{p.features.map((f) => (<Badge key={f} variant="secondary" className="text-xs">{f}</Badge>))}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main Page ── */
export default function Properties() {
  const properties = useStore((s) => s.properties);
  const totalCount = useStore((s) => s.totalCount);
  const page = useStore((s) => s.page);
  const pageSize = useStore((s) => s.pageSize);
  const loading = useStore((s) => s.loading);
  const dongList = useStore((s) => s.dongList);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const setPage = useStore((s) => s.setPage);
  const loadProperties = useStore((s) => s.loadProperties);
  const loadDongList = useStore((s) => s.loadDongList);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const selectedId = useStore((s) => s.selectedPropertyId);
  const selectProperty = useStore((s) => s.selectProperty);
  const compareIds = useStore((s) => s.compareIds);
  const toggleCompare = useStore((s) => s.toggleCompare);
  const clearCompare = useStore((s) => s.clearCompare);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    loadProperties();
    loadDongList();
  }, [loadProperties, loadDongList]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const selectedProperty = selectedId ? properties.find((p) => p.id === selectedId) : null;
  const compareProperties = compareIds.map((id) => properties.find((p) => p.id === id)).filter(Boolean) as Property[];

  return (
    <div className="space-y-6">
      {/* Compare bar */}
      {compareIds.length > 0 && (
        <div className="bg-card border rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4" />
            <span className="font-medium">{compareIds.length}개 선택됨</span>
            <span className="text-muted-foreground">(최대 5개)</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={clearCompare}>선택 해제</Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setShowCompare(true)} disabled={compareIds.length < 2}>비교하기</Button>
          </div>
        </div>
      )}

      {showCompare && compareProperties.length >= 2 && (
        <CompareView properties={compareProperties} onClose={() => setShowCompare(false)} />
      )}

      <div className="flex gap-6 h-[calc(100vh-5rem)]">
        {/* Left: table */}
        <div className="flex-1 min-w-0 max-w-3xl flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold">매물 목록</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {loading ? "로딩 중..." : `총 ${totalCount.toLocaleString()}건`}
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="매물명, 주소 검색..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} className="pl-9 h-9 bg-card text-sm" />
            </div>
            <Select value={filters.dong} onValueChange={(v) => setFilters({ dong: v })}>
              <SelectTrigger className="w-[110px] h-9 bg-card text-sm"><SelectValue placeholder="동" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체 동</SelectItem>
                {dongList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.propertyType} onValueChange={(v) => setFilters({ propertyType: v as PropertyType | "전체" })}>
              <SelectTrigger className="w-[110px] h-9 bg-card text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.dealType} onValueChange={(v) => setFilters({ dealType: v as DealType | "전체" })}>
              <SelectTrigger className="w-[90px] h-9 bg-card text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{dealTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ sortBy: v as typeof filters.sortBy })}>
              <SelectTrigger className="w-[110px] h-9 bg-card text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{sortOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 text-sm text-muted-foreground" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />초기화
            </Button>
          </div>

          {/* Table */}
          {properties.length === 0 && !loading ? (
            <div className="text-center py-20">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-medium">검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="bg-secondary hover:bg-secondary">
                    <TableHead className="w-8 text-center" />
                    <TableHead className="w-10 text-center" />
                    <TableHead className="text-sm font-medium">매물명</TableHead>
                    <TableHead className="text-sm font-medium">동</TableHead>
                    <TableHead className="text-sm font-medium">거래</TableHead>
                    <TableHead className="text-sm font-medium text-right">가격</TableHead>
                    <TableHead className="text-sm font-medium text-right">면적</TableHead>
                    <TableHead className="text-sm font-medium text-center">층</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((p) => (
                    <TableRow
                      key={p.id}
                      className={`cursor-pointer transition-colors ${selectedId === p.id ? "bg-accent" : "hover:bg-accent/50"}`}
                      onClick={() => selectProperty(p.id)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={compareIds.includes(p.id)} onChange={() => toggleCompare(p.id)} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleFavorite(p.id)}>
                          <Heart className={`h-3.5 w-3.5 ${p.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"} transition-colors`} />
                        </button>
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{p.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.address.replace("서울시 마포구 ", "")}</TableCell>
                      <TableCell className="text-sm">{p.dealType}</TableCell>
                      <TableCell className="text-sm font-semibold text-right tabular-nums">{formatPrice(p)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground text-right tabular-nums">{p.area}m²</TableCell>
                      <TableCell className="text-sm text-muted-foreground text-center">{p.floor ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page} / {totalPages} 페이지 (건당 {pageSize}건)
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(1)} disabled={page === 1}>처음</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(page - 1)} disabled={page === 1}>이전</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(page + 1)} disabled={page === totalPages}>다음</Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setPage(totalPages)} disabled={page === totalPages}>끝</Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 min-w-[360px]">
          {selectedProperty ? (
            <DetailPanel property={selectedProperty} onClose={() => selectProperty(null)} />
          ) : (
            <div className="h-full flex items-center justify-center border rounded-lg">
              <div className="text-center">
                <Building className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">매물을 선택하면</p>
                <p className="text-sm text-muted-foreground">상세 정보가 여기에 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
