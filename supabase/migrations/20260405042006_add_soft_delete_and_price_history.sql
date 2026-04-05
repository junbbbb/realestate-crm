-- 소프트 삭제 + last_seen_at 컬럼
alter table public.properties
  add column if not exists is_active boolean not null default true,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists first_seen_at timestamptz not null default now();

create index if not exists properties_is_active_idx on public.properties(is_active);
create index if not exists properties_last_seen_at_idx on public.properties(last_seen_at);

-- 가격 변동 히스토리
create table if not exists public.price_history (
  id bigserial primary key,
  article_no text not null references public.properties(id) on delete cascade,
  deal_or_warrant_price text,
  rent_price text,
  warrant_price integer,
  monthly_rent integer,
  price integer,
  change_type text, -- 'initial' | 'increase' | 'decrease' | 'no_change'
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_article_no_idx on public.price_history(article_no);
create index if not exists price_history_recorded_at_idx on public.price_history(recorded_at desc);

alter table public.price_history enable row level security;
create policy "Allow all on price_history" on public.price_history for all using (true) with check (true);
