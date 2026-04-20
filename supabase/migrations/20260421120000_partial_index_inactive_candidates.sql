-- 7일 미확인 매물 비활성화 쿼리 최적화 (statement timeout 방지)
-- `is_active = true AND last_seen_at < cutoff` 필터 전용 partial index
create index if not exists properties_active_last_seen_partial_idx
  on public.properties(last_seen_at)
  where is_active = true;
