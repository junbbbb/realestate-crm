-- 가격 변동 랭킹에 보증금/월세 상세 + 거래유형 코드 추가
ALTER TABLE price_change_rankings ADD COLUMN IF NOT EXISTS trade_type_code text;
ALTER TABLE price_change_rankings ADD COLUMN IF NOT EXISTS warrant_price bigint DEFAULT 0;
ALTER TABLE price_change_rankings ADD COLUMN IF NOT EXISTS monthly_rent bigint DEFAULT 0;
ALTER TABLE price_change_rankings ADD COLUMN IF NOT EXISTS prev_warrant_price bigint DEFAULT 0;
ALTER TABLE price_change_rankings ADD COLUMN IF NOT EXISTS prev_monthly_rent bigint DEFAULT 0;
