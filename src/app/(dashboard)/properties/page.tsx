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
  TrendingUp, Store, Users, FileText, BarChart3, Scale, Calculator, Plus, Bookmark,
  Car, Bath, Flame, CalendarCheck, Loader2, KeyRound, ExternalLink, StickyNote, Handshake, Trash2, RefreshCw,
} from "lucide-react";
import {
  fetchNaverDetail, NaverDetailInfo,
  formatHeating, formatHeatingEnergy, formatMovingIn, formatApprovalDate,
} from "@/lib/naver-detail";
import { compressToEncodedURIComponent } from "lz-string";
import { useDealStore } from "@/lib/deal-store";
import { useToastStore } from "@/lib/toast-store";
import { supabase } from "@/lib/supabase";
import { useCustomerStore, Customer } from "@/lib/customer-store";
import { useRouter } from "next/navigation";
import { BookmarkButton, CollectionPopup } from "@/components/collection-popup";
import NaverMap from "@/components/naver-map";
import { useSettingsStore } from "@/lib/settings-store";

const propertyTypes: (PropertyType | "전체")[] = ["전체", "상가", "건물", "사무실", "상가주택"];
const dealTypes: (DealType | "전체")[] = ["전체", "매매", "전세", "월세", "단기임대"];
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
function StartDealModal({ property, sellers, buyers, onConfirm, onClose }: {
  property: Property;
  sellers: Customer[];
  buyers: Customer[];
  onConfirm: (sellerId: string | null, buyerId: string | null) => void;
  onClose: () => void;
}) {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [buyerId, setBuyerId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[400px]">
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">거래 시작</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="text-sm font-medium truncate">{property.title}</p>
            <p className="text-xs text-muted-foreground">{property.dealType} · {property.address}</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">임대인 / 매도인</p>
              <Select value={sellerId || "_none"} onValueChange={(v) => setSellerId(v === "_none" ? null : v)}>
                <SelectTrigger className="h-9 text-sm">
                  <span>{sellerId ? sellers.find((c) => c.id === sellerId)?.name || "선택" : "미지정 (나중에 추가)"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">미지정 (나중에 추가)</SelectItem>
                  {sellers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">임차인 / 매수인</p>
              <Select value={buyerId || "_none"} onValueChange={(v) => setBuyerId(v === "_none" ? null : v)}>
                <SelectTrigger className="h-9 text-sm">
                  <span>{buyerId ? buyers.find((c) => c.id === buyerId)?.name || "선택" : "미지정 (나중에 추가)"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">미지정 (나중에 추가)</SelectItem>
                  {buyers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1 gap-1.5" onClick={() => onConfirm(sellerId, buyerId)}>
              <Handshake className="h-4 w-4" />시작
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailPanel({ property, onClose, onMemoSaved }: { property: Property; onClose: () => void; onMemoSaved?: (id: string, memo: string) => void }) {
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const saveMemo = useStore((s) => s.saveMemo);
  const addDeal = useDealStore((s) => s.addDeal);
  const { customers } = useCustomerStore();
  const [showDealModal, setShowDealModal] = useState(false);
  const [showDealCreated, setShowDealCreated] = useState(false);
  const [showDeleteMyListing, setShowDeleteMyListing] = useState(false);
  const loadProperties = useStore((s) => s.loadProperties);
  const router = useRouter();
  const { containerRef, thumbRef } = useScrollReveal<HTMLDivElement>();
  const [tab, setTab] = useState<"info" | "area" | "legal" | "cost">("info");
  const [detail, setDetail] = useState<NaverDetailInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memoValue, setMemoValue] = useState(property.memo ?? "");
  const memoChanged = memoValue !== (property.memo ?? "");

  useEffect(() => { setMemoValue(property.memo ?? ""); }, [property.id, property.memo]);

  const loadDetail = (skipCache = false) => {
    if (skipCache) setDetail(null);
    setDetailLoading(true);
    fetchNaverDetail(property.id, property.realEstateTypeCode, property.tradeTypeCode, { skipCache })
      .then((d) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  };

  useEffect(() => {
    setDetail(null);
    loadDetail();
  }, [property.id, property.realEstateTypeCode, property.tradeTypeCode]);

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
          <div>
            <h2 className="text-xl font-bold">{property.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{property.propertyType} · {property.address}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Price + Yield */}
        <div className="bg-secondary rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold"><span className="text-sm font-medium text-muted-foreground mr-1.5">{property.dealType}</span>{formatPrice(property)}</p>
            {yieldRate && (
              <p className="text-sm font-bold text-green-600 flex items-center gap-1">
                {yieldRate.toFixed(1)}%
                <span className="relative group/tip">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[10px] text-muted-foreground cursor-help">?</span>
                  <span className="absolute bottom-6 right-0 hidden group-hover/tip:block w-[200px] bg-foreground text-background text-[11px] rounded-lg p-2.5 leading-relaxed shadow-lg z-50">
                    연 수익률 = (월세 × 12) / 보증금 × 100<br /><br />
                    월세 매물에만 표시됩니다. 권리금, 인테리어 비용 등은 미포함된 단순 수익률입니다.
                  </span>
                </span>
              </p>
            )}
          </div>
          {property.premiumKey && (
            <p className="text-xs text-muted-foreground mt-1">권리금: {formatMoney(property.premiumKey)}</p>
          )}
        </div>

        {/* 거래 시작 + 네이버 바로가기 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-sm gap-1.5"
            onClick={() => setShowDealModal(true)}
          >
            <Handshake className="h-3.5 w-3.5" />거래 시작
          </Button>
          <a
            href={(() => {
              const lng = Number(detail?.coordinates?.xCoordinate ?? 126.908);
              const lat = Number(detail?.coordinates?.yCoordinate ?? 37.556);
              const zoom = 19;
              const n = Math.pow(2, zoom);
              const tileX = Math.floor((lng + 180) / 360 * n);
              const latRad = lat * Math.PI / 180;
              const tileY = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
              const layer = compressToEncodedURIComponent(JSON.stringify([
                { id: "article_list", searchParams: { type: "CLUSTER", clusterId: `${zoom}/${tileX}/${tileY}` } },
                { id: "article_detail", params: { articleId: property.id }, searchParams: {} }
              ]));
              return `https://fin.land.naver.com/map?center=${lng}-${lat}&zoom=16&tradeTypes=A1-B1-B2-B3&realEstateTypes=D02-D03-D04-E01-Z00&layer=${layer}`;
            })()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input text-sm font-medium gap-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-sm bg-[#03C75A] text-white text-[10px] font-bold leading-none">N</span>네이버
          </a>
        </div>

        {showDealModal && (() => {
          const sellers = customers.filter((c) => c.role === "seller" || c.role === "both");
          const buyers = customers.filter((c) => c.role === "buyer" || c.role === "both");
          return (
            <StartDealModal
              property={property}
              sellers={sellers}
              buyers={buyers}
              onConfirm={async (sellerId, buyerId) => {
                await addDeal({
                  propertyId: property.id,
                  dealType: property.dealType,
                  sellerId: sellerId || undefined,
                  buyerId: buyerId || undefined,
                });
                setShowDealModal(false);
                setShowDealCreated(true);
              }}
              onClose={() => setShowDealModal(false)}
            />
          );
        })()}

        {showDealCreated && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
              <p className="text-sm font-medium">거래가 생성되었습니다</p>
              <p className="text-xs text-muted-foreground">해당 거래로 이동하시겠습니까?</p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowDealCreated(false)}>여기서 계속</Button>
                <Button size="sm" onClick={() => { setShowDealCreated(false); router.push("/my-listings"); }}>거래 관리로 이동</Button>
              </div>
            </div>
          </div>
        )}

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
          <button
            onClick={() => loadDetail(true)}
            disabled={detailLoading}
            className="ml-auto p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            title="상세정보 새로고침"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${detailLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tab: 기본 */}
        {tab === "info" && detailLoading && !detail && (
          <div className="space-y-3 animate-pulse">
            <div className="flex gap-1.5">
              {[80, 60, 70, 55].map((w, i) => <div key={i} className="h-5 rounded-full bg-muted" style={{ width: w }} />)}
            </div>
            <div className="rounded-lg bg-muted h-[160px]" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="space-y-1"><div className="h-3 bg-muted rounded w-12" /><div className="h-4 bg-muted rounded w-20" /></div>)}
            </div>
          </div>
        )}
        {tab === "info" && !(detailLoading && !detail) && (
          <div className="space-y-4">
            {/* 1. 핵심 스펙 한줄 태그 */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">{property.areaLabel}{detail?.pyeongArea ? ` (${detail.pyeongArea}평)` : ""}</Badge>
              {property.floor && <Badge variant="secondary" className="text-xs">{property.floor}/{property.totalFloors}층</Badge>}
              {detail?.isParkingPossible != null && (
                <Badge variant="secondary" className="text-xs">
                  주차 {detail.isParkingPossible ? "가능" : "불가"}{detail.totalParkingCount != null ? ` ${detail.totalParkingCount}대` : ""}
                </Badge>
              )}
              {detail && <Badge variant="secondary" className="text-xs">{formatMovingIn(detail)}</Badge>}
              {detail?.bathRoomCount != null && <Badge variant="secondary" className="text-xs">욕실 {detail.bathRoomCount}개</Badge>}
              {detail?.currentBusinessType && <Badge variant="secondary" className="text-xs">현 {detail.currentBusinessType}</Badge>}
              {detail?.isIllegalBuilding && <Badge variant="destructive" className="text-xs">위반건축물</Badge>}
            </div>

            {/* 2. 지도 + 주소 */}
            {detail?.coordinates ? (
              <NaverMap
                lat={detail.coordinates.yCoordinate}
                lng={detail.coordinates.xCoordinate}
                className="rounded-lg border border-border h-[160px]"
              />
            ) : (
              <div className="rounded-lg bg-secondary border border-border h-[160px] flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{detailLoading ? "지도 로딩 중..." : "위치 정보 없음"}</p>
                </div>
              </div>
            )}
            <p className="text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{property.address}</p>

            {/* 3. 건물 정보 */}
            {detail && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {detail.buildingUse && (
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-muted-foreground">용도</p>
                      <p className="text-sm font-medium">{detail.buildingUse}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">사용승인</p>
                    <p className="text-sm font-medium">
                      {formatApprovalDate(detail.buildingConjunctionDate)}
                      {detail.approvalElapsedYear ? ` (${detail.approvalElapsedYear}년)` : ""}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">난방</p>
                    <p className="text-sm font-medium">{formatHeating(detail.heatingAndCoolingSystemType)} / {formatHeatingEnergy(detail.heatingEnergyType)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">등록일</p>
                    <p className="text-sm font-medium">{property.createdAt}</p>
                  </div>
                </div>
              </>
            )}

            {/* 4. 중개사 — 전화 버튼 강조 */}
            {detail && (detail.brokerageName || detail.phoneBrokerage) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      {detail.brokerageName && <p className="text-sm font-medium">{detail.brokerageName}</p>}
                      {detail.brokerName && <p className="text-xs text-muted-foreground">담당: {detail.brokerName}</p>}
                    </div>
                    {detail.businessRegistrationNumber && (
                      <p className="text-[11px] text-muted-foreground">{detail.businessRegistrationNumber}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {detail.phoneBrokerage && (
                      <a href={`tel:${detail.phoneBrokerage}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium py-2 hover:bg-primary/90 transition-colors">
                        <Phone className="h-3.5 w-3.5" />{detail.phoneBrokerage}
                      </a>
                    )}
                    {detail.phoneMobile && (
                      <a href={`tel:${detail.phoneMobile}`} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border text-sm font-medium py-2 hover:bg-accent transition-colors">
                        <Phone className="h-3.5 w-3.5" />{detail.phoneMobile}
                      </a>
                    )}
                  </div>
                  {detail.agentAddress && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />{detail.agentAddress}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* 5. 설명 */}
            {(detail?.articleDescription || property.description) && (
              <>
                <Separator />
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {detail?.articleDescription || property.description}
                </p>
              </>
            )}

            {property.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {property.features.map((f) => (<Badge key={f} variant="outline" className="text-xs">{f}</Badge>))}
              </div>
            )}

            {/* 6. 개인 메모 */}
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" />메모</p>
                {memoChanged && (
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => { saveMemo(property.id, memoValue); onMemoSaved?.(property.id, memoValue); }}
                  >
                    저장
                  </Button>
                )}
              </div>
              <textarea
                placeholder="이 매물에 대한 메모를 남겨보세요..."
                value={memoValue}
                onChange={(e) => setMemoValue(e.target.value)}
                className={`w-full text-sm bg-secondary/50 border rounded-md p-2.5 resize-none h-[80px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground ${memoChanged ? "border-primary" : ""}`}
              />
            </div>

            {/* 개인매물 삭제 */}
            {property.isMyListing && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteMyListing(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />개인 매물 삭제
                </Button>
              </>
            )}
            {showDeleteMyListing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card border rounded-lg shadow-lg p-6 w-[320px] space-y-4">
                  <p className="text-sm font-medium">이 매물을 삭제하시겠습니까?</p>
                  <p className="text-xs text-muted-foreground">{property.title}</p>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowDeleteMyListing(false)}>취소</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      await supabase.from("properties").update({ is_active: false }).eq("id", property.id);
                      useToastStore.getState().show("매물이 삭제되었습니다");
                      setShowDeleteMyListing(false);
                      onClose();
                      loadProperties();
                    }}>삭제</Button>
                  </div>
                </div>
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
    <div className="bg-card rounded-lg border overflow-visible">
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
              <td className="p-3 font-medium text-muted-foreground bg-secondary whitespace-nowrap">
                {label === "수익률" ? (
                  <span className="flex items-center gap-1">
                    {label}
                    <span className="relative group/tip">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[10px] text-muted-foreground cursor-help">?</span>
                      <span className="fixed hidden group-hover/tip:block w-[220px] bg-foreground text-background text-[11px] rounded-lg p-2.5 leading-relaxed shadow-lg z-[100]" style={{ transform: "translate(-50%, -110%)" }}>
                        연 수익률 = (월세 × 12) / 보증금 × 100<br /><br />권리금, 인테리어 비용 등은 미포함된 단순 수익률입니다.
                      </span>
                    </span>
                  </span>
                ) : label}
              </td>
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
const myListingPropTypes = ["상가", "건물", "사무실", "상가주택"];
const myListingDealTypes = ["매매", "전세", "월세", "단기임대"];
const myListingTradeCode: Record<string, string> = { "매매": "A1", "전세": "B1", "월세": "B2", "단기임대": "B3" };
const myListingPropCode: Record<string, string> = { "상가": "D02", "건물": "D04", "사무실": "D01", "상가주택": "D05" };

function MyListingForm({ dongList, onClose, onSaved }: { dongList: string[]; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [dong, setDong] = useState("");
  const [propType, setPropType] = useState("상가");
  const [dealType, setDealType] = useState("월세");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [area, setArea] = useState("");
  const [floorInfo, setFloorInfo] = useState("");
  const [desc, setDesc] = useState("");

  async function handleSubmit() {
    if (!title.trim() || !dong) return;
    const id = `MY-${Date.now()}`;
    await supabase.from("properties").insert({
      id, article_no: id, article_name: title.trim(),
      real_estate_type: myListingPropCode[propType] || "D02", real_estate_type_name: propType,
      trade_type: myListingTradeCode[dealType] || "B2", trade_type_name: dealType,
      dong, address: `서울시 마포구 ${dong}`,
      price: dealType === "매매" ? (Number(price) || 0) * 10000 : (Number(deposit) || 0) * 10000,
      deal_or_warrant_price: "", warrant_price: (Number(deposit) || 0) * 10000,
      monthly_rent: (Number(monthlyRent) || 0) * 10000,
      area1: Number(area) || 0, area2: Number(area) || 0,
      floor_info: floorInfo, direction: "",
      description: desc.trim() || title.trim(), tag_list: [],
      realtor_name: "", confirm_date: new Date().toISOString().split("T")[0],
      source_url: "", is_my_listing: true, is_active: true,
      last_seen_at: new Date().toISOString(),
    });
    useToastStore.getState().show("개인 매물이 등록되었습니다");
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-lg shadow-lg w-[calc(100vw-2rem)] sm:w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">개인 매물 등록</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">매물명 *</p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 합정역 1층 상가" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">동 *</p>
              <Select value={dong} onValueChange={(v) => setDong(v ?? "")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="동 선택" /></SelectTrigger>
                <SelectContent>{dongList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">유형</p>
              <Select value={propType} onValueChange={(v) => setPropType(v ?? "상가")}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{myListingPropTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">거래 유형</p>
            <Select value={dealType} onValueChange={(v) => setDealType(v ?? "월세")}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{myListingDealTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {dealType === "매매" ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">매매가 (만원)</p>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="h-9 text-sm" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">보증금 (만원)</p>
                <Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">월세 (만원)</p>
                <Input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">면적 (m²)</p>
              <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">층 (예: 1/5)</p>
              <Input value={floorInfo} onChange={(e) => setFloorInfo(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">설명</p>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="매물 설명..." className="w-full text-sm border rounded-md p-2.5 resize-none h-[60px] focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>취소</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!title.trim() || !dong}>등록</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Properties() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const selectParam = searchParams?.get("select");
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
  const [showBulkCollection, setShowBulkCollection] = useState(false);
  const [showDongFilter, setShowDongFilter] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [priceMinInput, setPriceMinInput] = useState("");
  const [priceMaxInput, setPriceMaxInput] = useState("");
  const [rentMinInput, setRentMinInput] = useState("");
  const [rentMaxInput, setRentMaxInput] = useState("");
  const [settingsApplied, setSettingsApplied] = useState(false);
  const [showMyListingForm, setShowMyListingForm] = useState(false);
  const [savedFilters, setSavedFilters] = useState<Record<string, Partial<typeof filters>>>({});

  useEffect(() => {
    function applySettings() {
      const s = useSettingsStore.getState();
      if (s.pageSize !== pageSize) useStore.getState().setPageSize(s.pageSize);
      const initFilters: Record<string, unknown> = {};
      if (s.defaultDong !== "전체") initFilters.dong = [s.defaultDong];
      if (s.defaultPropertyType !== "전체") initFilters.propertyType = s.defaultPropertyType;
      if (s.defaultDealType !== "전체") initFilters.dealType = s.defaultDealType;
      if (Object.keys(initFilters).length > 0) {
        setFilters(initFilters);
      } else {
        loadProperties();
      }
      setSettingsApplied(true);
    }
    const unsub = useSettingsStore.persist.onFinishHydration(applySettings);
    if (useSettingsStore.persist.hasHydrated()) applySettings();
    else loadProperties();
    loadDongList();
    useCustomerStore.getState().loadCustomers();
    if (selectParam) selectProperty(selectParam);
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const compareCache = useStore((s) => s.compareCache);
  const selectedProperty = selectedId ? properties.find((p) => p.id === selectedId) : null;
  const compareProperties = compareIds.map((id) => compareCache[id] || properties.find((p) => p.id === id)).filter(Boolean) as Property[];

  return (
    <div>
      {showCompare && compareIds.length >= 2 && (
        <div className="mb-4">
          <CompareView properties={compareProperties} onClose={() => setShowCompare(false)} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-3.5rem)]">
        {/* Left: table */}
        <div className="flex-1 min-w-0 md:max-w-3xl flex flex-col">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">매물 목록</h1>
              <div className="flex gap-2 mt-2">
                {(["전체", "네이버", "개인매물"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      const { source: _s, ...rest } = filters;
                      setSavedFilters((prev) => ({ ...prev, [filters.source]: rest }));
                      if (tab === "개인매물") {
                        // 개인매물: 필터 전부 초기화 + source만 설정 (한번에)
                        setFilters({ search: "", dong: [], propertyType: "전체", dealType: "전체", areaMin: 0, areaMax: 0, priceMin: 0, priceMax: 0, rentMin: 0, rentMax: 0, floorFilter: "전체", sortBy: "default", source: tab });
                      } else {
                        const saved = savedFilters[tab];
                        setFilters(saved ? { ...saved, source: tab } : { source: tab });
                      }
                    }}
                    className={`text-sm px-3 py-1 rounded-md transition-colors ${filters.source === tab ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent"}`}
                  >{tab}</button>
                ))}
              </div>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowMyListingForm(true)}>
              <Plus className="h-4 w-4" />개인 매물 등록
            </Button>
          </div>

          {/* Filters — 개인매물 탭에서는 숨김 */}
          {filters.source !== "개인매물" && <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="매물명, 주소 검색..." value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} className={`pl-9 h-9 bg-card text-sm border-2 ${filters.search ? "border-primary" : "border-transparent"}`} />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowDongFilter(!showDongFilter)}
                className={`h-9 px-3 rounded-md border-2 bg-card text-sm flex items-center gap-1 transition-colors ${filters.dong.length > 0 ? "border-primary" : "border-transparent hover:bg-accent"}`}
              >
                {filters.dong.length === 0 ? "전체 동" : filters.dong.length === 1 ? filters.dong[0] : `${filters.dong[0]} 외 ${filters.dong.length - 1}`}
              </button>
              {showDongFilter && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowDongFilter(false)} />
                  <div className="absolute top-10 left-0 z-30 bg-card border rounded-lg shadow-lg p-3 w-[200px] max-h-[300px] overflow-y-auto space-y-1">
                    <button
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${filters.dong.length === 0 ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      onClick={() => { setFilters({ dong: [] }); setShowDongFilter(false); }}
                    >
                      전체 동
                    </button>
                    {dongList.map((d) => {
                      const selected = filters.dong.includes(d);
                      return (
                        <button
                          key={d}
                          className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center gap-2 ${selected ? "bg-primary/10 font-medium" : "hover:bg-accent"}`}
                          onClick={() => {
                            const next = selected ? filters.dong.filter((x) => x !== d) : [...filters.dong, d];
                            setFilters({ dong: next });
                          }}
                        >
                          <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${selected ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                            {selected && <span className="text-[10px]">✓</span>}
                          </span>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <Select value={filters.propertyType} onValueChange={(v) => setFilters({ propertyType: v as PropertyType | "전체" })}>
              <SelectTrigger className={`w-[110px] h-9 bg-card text-sm border-2 ${filters.propertyType !== "전체" ? "border-primary" : "border-transparent"}`}><span>{filters.propertyType === "전체" ? "전체 유형" : filters.propertyType}</span></SelectTrigger>
              <SelectContent>{propertyTypes.map((t) => <SelectItem key={t} value={t}>{t === "전체" ? "전체 유형" : t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.dealType} onValueChange={(v) => setFilters({ dealType: v as DealType | "전체" })}>
              <SelectTrigger className={`w-[100px] h-9 bg-card text-sm border-2 ${filters.dealType !== "전체" ? "border-primary" : "border-transparent"}`}><span>{filters.dealType === "전체" ? "전체 거래" : filters.dealType}</span></SelectTrigger>
              <SelectContent>{dealTypes.map((t) => <SelectItem key={t} value={t}>{t === "전체" ? "전체 거래" : t}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.floorFilter} onValueChange={(v) => setFilters({ floorFilter: v as typeof filters.floorFilter })}>
              <SelectTrigger className={`w-[100px] h-9 bg-card text-sm border-2 ${filters.floorFilter !== "전체" ? "border-primary" : "border-transparent"}`}><span>{filters.floorFilter === "전체" ? "전체 층" : filters.floorFilter}</span></SelectTrigger>
              <SelectContent>{floorOptions.map((t) => <SelectItem key={t} value={t}>{t === "전체" ? "전체 층" : t}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative">
              <button
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className={`h-9 px-3 rounded-md border-2 bg-card text-sm flex items-center gap-1 transition-colors ${filters.priceMin > 0 || filters.priceMax > 0 || filters.rentMin > 0 || filters.rentMax > 0 ? "border-primary" : "border-transparent hover:bg-accent"}`}
              >
                {filters.priceMin > 0 || filters.priceMax > 0 || filters.rentMin > 0 || filters.rentMax > 0 ? "가격 적용중" : "가격"}
              </button>
              {showPriceFilter && (
                <>
                <div className="fixed inset-0 z-20" onClick={() => setShowPriceFilter(false)} />
                <div className="absolute top-10 left-0 z-30 bg-card border rounded-lg shadow-lg p-4 w-[280px] space-y-4">
                  {/* 보증금/매매가 */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium">보증금 / 매매가 / 전세금</p>
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="최소 (만)" value={priceMinInput} onChange={(e) => setPriceMinInput(e.target.value)} className="h-8 text-sm" />
                      <span className="text-muted-foreground text-sm">~</span>
                      <Input type="number" placeholder="최대 (만)" value={priceMaxInput} onChange={(e) => setPriceMaxInput(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "5천 이하", min: 0, max: 5000 },
                        { label: "1억 이하", min: 0, max: 10000 },
                        { label: "1~5억", min: 10000, max: 50000 },
                        { label: "5~10억", min: 50000, max: 100000 },
                        { label: "10억+", min: 100000, max: 0 },
                      ].map((p) => (
                        <button key={p.label} className="text-[11px] border rounded px-2 py-0.5 hover:bg-accent transition-colors"
                          onClick={() => { setPriceMinInput(p.min > 0 ? String(p.min) : ""); setPriceMaxInput(p.max > 0 ? String(p.max) : ""); }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 월세 */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium">월세</p>
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="최소 (만)" value={rentMinInput} onChange={(e) => setRentMinInput(e.target.value)} className="h-8 text-sm" />
                      <span className="text-muted-foreground text-sm">~</span>
                      <Input type="number" placeholder="최대 (만)" value={rentMaxInput} onChange={(e) => setRentMaxInput(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "50만 이하", min: 0, max: 50 },
                        { label: "50~100만", min: 50, max: 100 },
                        { label: "100~200만", min: 100, max: 200 },
                        { label: "200~500만", min: 200, max: 500 },
                        { label: "500만+", min: 500, max: 0 },
                      ].map((p) => (
                        <button key={p.label} className="text-[11px] border rounded px-2 py-0.5 hover:bg-accent transition-colors"
                          onClick={() => { setRentMinInput(p.min > 0 ? String(p.min) : ""); setRentMaxInput(p.max > 0 ? String(p.max) : ""); }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => {
                      setPriceMinInput(""); setPriceMaxInput(""); setRentMinInput(""); setRentMaxInput("");
                      setFilters({ priceMin: 0, priceMax: 0, rentMin: 0, rentMax: 0 });
                      setShowPriceFilter(false);
                    }}>초기화</Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => {
                      setFilters({
                        priceMin: Number(priceMinInput) || 0,
                        priceMax: Number(priceMaxInput) || 0,
                        rentMin: Number(rentMinInput) || 0,
                        rentMax: Number(rentMaxInput) || 0,
                      });
                      setShowPriceFilter(false);
                    }}>적용</Button>
                  </div>
                </div>
                </>
              )}
            </div>
            <Select value={filters.sortBy} onValueChange={(v) => setFilters({ sortBy: v as typeof filters.sortBy })}>
              <SelectTrigger className={`w-[110px] h-9 bg-card text-sm border-2 ${filters.sortBy !== "default" ? "border-primary" : "border-transparent"}`}><span>{sortOptions.find((o) => o.value === filters.sortBy)?.label ?? "정렬"}</span></SelectTrigger>
              <SelectContent>{sortOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 text-sm text-muted-foreground" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />초기화
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">{loading ? "로딩 중..." : `${totalCount.toLocaleString()}건 · ${pageSize}개씩`}</span>
          </div>}

          {/* Table */}
          {properties.length === 0 && !loading ? (
            <div className="text-center py-20">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-medium">검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border overflow-auto flex-1 relative">
              {loading && (
                <div className="absolute inset-0 bg-card/60 z-20 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
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
                        <BookmarkButton propertyId={p.id} />
                      </TableCell>
                      <TableCell className="font-medium text-sm max-w-[180px] truncate">{p.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.address.replace("서울시 마포구 ", "")}</TableCell>
                      <TableCell className="text-sm">{p.dealType}</TableCell>
                      <TableCell className="text-sm font-semibold text-right tabular-nums">
                        <span className="flex items-center justify-end gap-1">
                          {p.priceChange === "increase" && <span className="text-red-500 text-[10px]">▲</span>}
                          {p.priceChange === "decrease" && <span className="text-blue-500 text-[10px]">▼</span>}
                          {p.priceChange === "new" && <span className="text-green-500 text-[10px]">N</span>}
                          {formatPrice(p)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground text-right tabular-nums">{p.areaLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground text-center">{p.floor ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-0.5 mt-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-base" onClick={() => setPage(1)} disabled={page === 1}>&laquo;</Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-base" onClick={() => setPage(page - 1)} disabled={page === 1}>&lsaquo;</Button>
              <span className="text-sm tabular-nums font-medium px-2">{page}/{totalPages}</span>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-base" onClick={() => setPage(page + 1)} disabled={page === totalPages}>&rsaquo;</Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-base" onClick={() => setPage(totalPages)} disabled={page === totalPages}>&raquo;</Button>
            </div>
          )}
        </div>

        {/* Right: detail panel — mobile: overlay, desktop: side panel */}
        {selectedProperty ? (
          <div className="fixed inset-0 z-40 bg-background overflow-y-auto md:static md:z-auto md:bg-transparent md:overflow-visible md:w-[380px] md:shrink-0">
            <DetailPanel property={selectedProperty} onClose={() => selectProperty(null)} />
          </div>
        ) : (
          <div className="hidden md:flex w-[380px] shrink-0 h-full items-center justify-center border rounded-lg">
            <div className="text-center">
              <Building className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">매물을 선택하면</p>
              <p className="text-sm text-muted-foreground">상세 정보가 여기에 표시됩니다</p>
            </div>
          </div>
        )}
      </div>

      {showMyListingForm && <MyListingForm dongList={dongList} onClose={() => setShowMyListingForm(false)} onSaved={loadProperties} />}

      {/* Bottom floating action bar — 왼쪽 */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-30 bg-card border rounded-xl shadow-lg px-3 md:px-5 py-3 flex items-center gap-2 md:gap-4 animate-in slide-in-from-bottom-4 duration-200 max-w-[calc(100vw-2rem)]">
          <span className="text-sm font-medium">{compareIds.length}개 선택</span>
          <Separator orientation="vertical" className="h-5" />
          <div className="relative">
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => setShowBulkCollection(!showBulkCollection)}>
              <Bookmark className="h-3.5 w-3.5" />컬렉션에 저장
            </Button>
            {showBulkCollection && (
              <div className="absolute bottom-12 left-0">
                <CollectionPopup
                  propertyIds={compareIds}
                  onClose={() => { setShowBulkCollection(false); clearCompare(); }}
                />
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={() => setShowCompare(true)} disabled={compareIds.length < 2}>
            <Scale className="h-3.5 w-3.5" />비교하기
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={clearCompare}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
