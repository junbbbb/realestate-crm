import { supabase } from "@/config/supabase";
import { YieldCalcMethod } from "@/lib/settings-store";

export interface UserSettings {
  pageSize: number;
  yieldCalcMethod: YieldCalcMethod;
  defaultDong: string;
  defaultPropertyType: string;
  defaultDealType: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  pageSize: 50,
  yieldCalcMethod: "deposit",
  defaultDong: "전체",
  defaultPropertyType: "전체",
  defaultDealType: "전체",
};

// ---------------------------------------------------------------------------
// Get user settings
// ---------------------------------------------------------------------------
export async function getSettings(
  userId: string | null
): Promise<UserSettings> {
  if (!userId) {
    return DEFAULT_SETTINGS;
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // No settings row yet — return defaults
    return DEFAULT_SETTINGS;
  }

  return {
    pageSize: (data.page_size as number) || DEFAULT_SETTINGS.pageSize,
    yieldCalcMethod:
      (data.yield_calc_method as YieldCalcMethod) || DEFAULT_SETTINGS.yieldCalcMethod,
    defaultDong: (data.default_dong as string) || DEFAULT_SETTINGS.defaultDong,
    defaultPropertyType:
      (data.default_property_type as string) || DEFAULT_SETTINGS.defaultPropertyType,
    defaultDealType:
      (data.default_deal_type as string) || DEFAULT_SETTINGS.defaultDealType,
  };
}

// ---------------------------------------------------------------------------
// Save user settings (upsert)
// ---------------------------------------------------------------------------
export async function saveSettings(
  userId: string | null,
  settings: Partial<UserSettings>
): Promise<boolean> {
  if (!userId) {
    return true;
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (settings.pageSize !== undefined) row.page_size = settings.pageSize;
  if (settings.yieldCalcMethod !== undefined)
    row.yield_calc_method = settings.yieldCalcMethod;
  if (settings.defaultDong !== undefined) row.default_dong = settings.defaultDong;
  if (settings.defaultPropertyType !== undefined)
    row.default_property_type = settings.defaultPropertyType;
  if (settings.defaultDealType !== undefined)
    row.default_deal_type = settings.defaultDealType;

  const { error } = await supabase
    .from("user_settings")
    .upsert(row, { onConflict: "user_id" });
  if (error) {
    console.error("saveSettings error:", error);
    return false;
  }
  return true;
}
