ALTER TABLE properties ADD COLUMN IF NOT EXISTS trade_status text DEFAULT 'active';
-- active: 거래중, sold: 거래완료
