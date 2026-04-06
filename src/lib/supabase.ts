import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseProperty = {
  id: string;
  article_no: string;
  article_name: string;
  real_estate_type: string;
  real_estate_type_name: string;
  trade_type: string;
  trade_type_name: string;
  dong: string;
  address: string;
  deal_or_warrant_price: string;
  rent_price: string | null;
  warrant_price: number;
  monthly_rent: number;
  price: number;
  area1: number;
  area2: number;
  floor_info: string;
  direction: string;
  description: string;
  tag_list: string[];
  latitude: number | null;
  longitude: number | null;
  realtor_name: string;
  confirm_date: string;
  source_url: string;
  is_favorite: boolean;
  is_my_listing: boolean;
  memo: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
};
