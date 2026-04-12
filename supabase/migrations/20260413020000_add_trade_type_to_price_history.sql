-- price_history에 거래유형 코드 추가
ALTER TABLE price_history ADD COLUMN IF NOT EXISTS trade_type text;
