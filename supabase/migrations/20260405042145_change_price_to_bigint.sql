-- price 관련 필드를 bigint로 (원 단위 가격 대응)
alter table public.properties
  alter column price type bigint,
  alter column warrant_price type bigint,
  alter column monthly_rent type bigint;

alter table public.price_history
  alter column price type bigint,
  alter column warrant_price type bigint,
  alter column monthly_rent type bigint;
