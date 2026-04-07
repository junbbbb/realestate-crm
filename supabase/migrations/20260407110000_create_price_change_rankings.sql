create table if not exists price_change_rankings (
  id serial primary key,
  article_no text not null,
  article_name text,
  property_type text,
  trade_type text,
  change_type text not null, -- 'increase' | 'decrease'
  prev_price bigint not null,
  current_price bigint not null,
  rate numeric(8,2) not null,
  updated_at timestamptz not null default now()
);

alter table price_change_rankings enable row level security;
create policy "allow all" on price_change_rankings for all using (true) with check (true);
