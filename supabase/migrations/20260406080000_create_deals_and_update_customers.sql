-- 고객에 역할 추가
ALTER TABLE customers ADD COLUMN IF NOT EXISTS role text DEFAULT 'buyer';
-- buyer: 임차인/매수인, seller: 임대인/매도인, both: 둘 다

-- 거래(딜) 테이블
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text REFERENCES properties(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  deal_type text NOT NULL DEFAULT '월세',
  status text NOT NULL DEFAULT '상담',
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_property_id_idx ON deals(property_id);
CREATE INDEX IF NOT EXISTS deals_seller_id_idx ON deals(seller_id);
CREATE INDEX IF NOT EXISTS deals_buyer_id_idx ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "anon_deals" ON deals FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
