"use client";

import { useSettingsStore, YieldCalcMethod, CrawlLog } from "@/lib/settings-store";
import { useStore } from "@/lib/store";
import { useEffect } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Settings, Monitor, Database, Trash2, CheckCircle, XCircle, Clock, LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

const pageSizeOptions = [20, 50, 100, 200];

const yieldOptions: { value: YieldCalcMethod; label: string; desc: string }[] = [
  { value: "deposit", label: "보증금 기준", desc: "월세 × 12 / 보증금" },
  { value: "investment", label: "실투자금 기준", desc: "월세 × 12 / (보증금 + 권리금)" },
  { value: "purchase", label: "매매가 기준", desc: "월세 × 12 / 매매가" },
];

function formatLogTime(ts: string) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const {
    pageSize, setPageSize,
    yieldCalcMethod, setYieldCalcMethod,
    defaultDong, setDefaultDong,
    defaultPropertyType, setDefaultPropertyType,
    defaultDealType, setDefaultDealType,
    crawlLogs, clearCrawlLogs,
  } = useSettingsStore();

  const dongList = useStore((s) => s.dongList);
  const loadDongList = useStore((s) => s.loadDongList);

  useEffect(() => {
    loadDongList();
  }, [loadDongList]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="h-7 w-7" />설정</h1>
        <p className="text-muted-foreground text-sm mt-1">표시 설정 및 크롤링 로그</p>
      </div>

      {/* 표시 설정 */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">표시 설정</h2>
        </div>

        <div className="space-y-4 bg-card border rounded-lg p-5">
          {/* 페이지당 건수 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">페이지당 표시 건수</p>
              <p className="text-xs text-muted-foreground">매물 목록에서 한 페이지에 보여줄 건수</p>
            </div>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[100px] h-9 bg-card text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}건</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 수익률 계산 */}
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">수익률 계산 방식</p>
              <p className="text-xs text-muted-foreground">매물 목록/상세에서 표시되는 수익률 계산 기준</p>
            </div>
            <div className="space-y-2">
              {yieldOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    yieldCalcMethod === opt.value ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="yield"
                    value={opt.value}
                    checked={yieldCalcMethod === opt.value}
                    onChange={() => setYieldCalcMethod(opt.value)}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* 기본 필터 */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">기본 필터</p>
              <p className="text-xs text-muted-foreground">매물 목록 진입 시 자동 적용되는 필터</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">동</p>
                <Select value={defaultDong} onValueChange={setDefaultDong}>
                  <SelectTrigger className="h-9 bg-card text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="전체">전체</SelectItem>
                    {dongList.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">유형</p>
                <Select value={defaultPropertyType} onValueChange={setDefaultPropertyType}>
                  <SelectTrigger className="h-9 bg-card text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["전체", "상가", "건물", "사무실", "상가주택"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">거래</p>
                <Select value={defaultDealType} onValueChange={setDefaultDealType}>
                  <SelectTrigger className="h-9 bg-card text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["전체", "매매", "전세", "월세", "단기임대"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 크롤링 로그 */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">크롤링 로그</h2>
          </div>
          {crawlLogs.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearCrawlLogs}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />로그 삭제
            </Button>
          )}
        </div>

        <div className="bg-card border rounded-lg">
          {crawlLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">크롤링 로그가 없습니다</p>
              <p className="text-xs text-muted-foreground mt-1">크롤링을 실행하면 여기에 기록됩니다</p>
            </div>
          ) : (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {crawlLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-start gap-3">
                  {log.status === "success" ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{formatLogTime(log.timestamp)}</p>
                      <Badge variant={log.status === "success" ? "secondary" : "destructive"} className="text-[10px]">
                        {log.status === "success" ? "성공" : "실패"}
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>총 {log.totalCount.toLocaleString()}건</span>
                      {log.newCount > 0 && <span>신규 {log.newCount}건</span>}
                      {log.updatedCount > 0 && <span>갱신 {log.updatedCount}건</span>}
                      <span>{log.duration}</span>
                    </div>
                    {log.message && (
                      <p className="text-xs text-muted-foreground mt-1">{log.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 로그아웃 */}
      <Separator />
      <Button
        variant="outline"
        className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
        onClick={async () => {
          await fetch("/api/auth", { method: "DELETE" });
          router.push("/login");
        }}
      >
        <LogOut className="h-4 w-4" />로그아웃
      </Button>
    </div>
  );
}
