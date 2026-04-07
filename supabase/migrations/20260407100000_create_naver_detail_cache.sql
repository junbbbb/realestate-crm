create table if not exists naver_detail_cache (
  article_number text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

-- 7일 이상 된 캐시 자동 삭제용 인덱스
create index idx_naver_detail_cache_fetched_at on naver_detail_cache (fetched_at);

-- RLS 비활성화 (내부 캐시용)
alter table naver_detail_cache enable row level security;
create policy "allow all" on naver_detail_cache for all using (true) with check (true);
