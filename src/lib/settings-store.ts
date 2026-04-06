import { create } from "zustand";
import { persist } from "zustand/middleware";

export type YieldCalcMethod = "deposit" | "investment" | "purchase";

interface SettingsState {
  // 표시 설정
  pageSize: number;
  yieldCalcMethod: YieldCalcMethod;
  defaultDong: string;
  defaultPropertyType: string;
  defaultDealType: string;

  // 크롤링 로그
  crawlLogs: CrawlLog[];

  // actions
  setPageSize: (size: number) => void;
  setYieldCalcMethod: (method: YieldCalcMethod) => void;
  setDefaultDong: (dong: string) => void;
  setDefaultPropertyType: (type: string) => void;
  setDefaultDealType: (type: string) => void;
  addCrawlLog: (log: CrawlLog) => void;
  clearCrawlLogs: () => void;
}

export interface CrawlLog {
  id: string;
  timestamp: string;
  status: "success" | "error";
  totalCount: number;
  newCount: number;
  updatedCount: number;
  duration: string;
  message?: string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pageSize: 50,
      yieldCalcMethod: "deposit",
      defaultDong: "전체",
      defaultPropertyType: "전체",
      defaultDealType: "전체",
      crawlLogs: [],

      setPageSize: (size) => set({ pageSize: size }),
      setYieldCalcMethod: (method) => set({ yieldCalcMethod: method }),
      setDefaultDong: (dong) => set({ defaultDong: dong }),
      setDefaultPropertyType: (type) => set({ defaultPropertyType: type }),
      setDefaultDealType: (type) => set({ defaultDealType: type }),
      addCrawlLog: (log) =>
        set((s) => ({ crawlLogs: [log, ...s.crawlLogs].slice(0, 100) })),
      clearCrawlLogs: () => set({ crawlLogs: [] }),
    }),
    { name: "crm-settings" }
  )
);
