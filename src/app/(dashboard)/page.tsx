"use client";

import { useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { useCollectionStore } from "@/lib/collection-store";
import { formatMoney, formatPrice } from "@/lib/format";
import { Building2, Heart, FolderOpen, Users, TrendingUp, MapPin, Bookmark, Clock } from "lucide-react";

export default function Dashboard() {
  const properties = useStore((s) => s.properties);
  const totalCount = useStore((s) => s.totalCount);
  const loadProperties = useStore((s) => s.loadProperties);
  const collections = useCollectionStore((s) => s.collections);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const favorites = useMemo(() => properties.filter((p) => p.isFavorite), [properties]);
  const myListings = useMemo(() => properties.filter((p) => p.isMyListing), [properties]);

  // 최근 저장된 매물 (컬렉션 entries에서 최신 5개)
  const recentSaved = useMemo(() => {
    const all: { propertyId: string; collectionName: string; addedAt: string }[] = [];
    for (const c of collections) {
      for (const e of c.entries || []) {
        all.push({ propertyId: e.propertyId, collectionName: c.name, addedAt: e.addedAt });
      }
    }
    return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 5);
  }, [collections]);

  const stats = [
    { label: "마포구 전체매물", value: totalCount, unit: "건", icon: Building2 },
    { label: "컬렉션", value: collections.length, unit: "개", icon: Bookmark },
    { label: "내 매물", value: myListings.length, unit: "건", icon: FolderOpen },
    { label: "고객", value: 0, unit: "명", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">대시보드</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">
              {s.value.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 최근 매물 */}
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            최근 매물
          </div>
          <div className="space-y-3">
            {properties.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{p.title}</span>
                </div>
                <span className="text-sm text-muted-foreground shrink-0 ml-3">{formatPrice(p)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 저장 */}
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
            <Bookmark className="h-4 w-4" />
            최근 저장
          </div>
          {recentSaved.length === 0 ? (
            <p className="text-sm text-muted-foreground">저장된 매물이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {recentSaved.map((s, i) => {
                const p = properties.find((pr) => pr.id === s.propertyId);
                const time = new Date(s.addedAt);
                const timeStr = `${(time.getMonth() + 1).toString().padStart(2, "0")}.${time.getDate().toString().padStart(2, "0")} ${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
                return (
                  <div key={`${s.propertyId}-${i}`} className="flex items-start gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p?.title ?? `매물 ${s.propertyId}`}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p ? `${p.propertyType} · ${p.dealType} ${formatPrice(p)} · ${p.address.replace("서울시 마포구 ", "")}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-primary font-medium flex items-center gap-1 justify-end"><FolderOpen className="h-3 w-3" />{s.collectionName}</p>
                      <p className="text-[11px] text-muted-foreground">{timeStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
