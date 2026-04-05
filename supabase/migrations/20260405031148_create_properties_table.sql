-- 매물 테이블
create table if not exists public.properties (
  id text primary key,
  article_no text,
  article_name text,
  real_estate_type text,
  real_estate_type_name text,
  trade_type text,
  trade_type_name text,
  dong text,
  address text,
  price integer default 0,
  deal_or_warrant_price text,
  rent_price text,
  monthly_rent integer default 0,
  warrant_price integer default 0,
  area1 numeric default 0,
  area2 numeric default 0,
  floor_info text,
  direction text,
  description text,
  tag_list text[],
  latitude numeric,
  longitude numeric,
  realtor_name text,
  confirm_date text,
  source_url text,
  is_favorite boolean default false,
  is_my_listing boolean default false,
  memo text,
  raw_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists properties_dong_idx on public.properties(dong);
create index if not exists properties_trade_type_idx on public.properties(trade_type_name);
create index if not exists properties_real_estate_type_idx on public.properties(real_estate_type_name);
create index if not exists properties_is_favorite_idx on public.properties(is_favorite);

-- 고객 테이블
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  memo text,
  interested_in text[],
  budget_min integer default 0,
  budget_max integer default 0,
  preferred_area text,
  preferred_floor text,
  business_type text,
  premium_budget integer,
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS (혼자 쓰므로 모두 허용)
alter table public.properties enable row level security;
alter table public.customers enable row level security;

create policy "Allow all on properties" on public.properties for all using (true) with check (true);
create policy "Allow all on customers" on public.customers for all using (true) with check (true);
