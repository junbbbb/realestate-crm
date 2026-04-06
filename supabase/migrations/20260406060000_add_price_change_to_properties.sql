ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_change text DEFAULT 'none';
-- none: 변동 없음, increase: 상승, decrease: 하락, new: 신규
ALTER TABLE properties ADD COLUMN IF NOT EXISTS prev_price bigint DEFAULT 0;
