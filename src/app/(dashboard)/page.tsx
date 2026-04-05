"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/format";
import { Building2, Heart, FolderOpen, Users, TrendingUp, MapPin } from "lucide-react";

export default function Dashboard() {
  const properties = useStore((s) => s.properties);
  const customers = useStore((s) => s.customers);
  const favorites = useMemo(() => properties.filter((p) => p.isFavorite), [properties]);
  const myListings = useMemo(() => properties.filter((p) => p.isMyListing), [properties]);
  const totalSaleValue = properties.reduce((s, p) => (p.dealType === "매매" ? s + p.price : s), 0);

  const stats = [
    { label: "전체 매물", value: properties.length, unit: "건", icon: Building2 },
    { label: "즐겨찾기", value: favorites.length, unit: "건", icon: Heart },
    { label: "내 매물", value: myListings.length, unit: "건", icon: FolderOpen },
    { label: "고객", value: customers.length, unit: "명", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">대시보드</h1>

      {/* Stats — no border, bg shift for depth */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">
              {s.value}
              <span className="text-base font-normal text-muted-foreground ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
            <TrendingUp className="h-4 w-4" />
            매매 총액
          </div>
          <p className="text-3xl font-bold">{formatMoney(totalSaleValue)}</p>
          <p className="text-sm text-muted-foreground mt-2">매매 매물 기준</p>
        </div>

        <div className="bg-card rounded-lg p-6">
          <p className="text-sm font-medium text-muted-foreground mb-4">최근 매물</p>
          <div className="space-y-3">
            {properties.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{p.title}</span>
                </div>
                <span className="text-sm text-muted-foreground shrink-0 ml-3">{p.dealType}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
