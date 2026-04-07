-- =============================================================
-- 1. 성능 최적화: 복합 인덱스 추가 (기존 코드 영향 없음)
-- =============================================================

-- 매물 목록 필터 쿼리 최적화 (is_active + dong + trade_type + real_estate_type)
CREATE INDEX IF NOT EXISTS idx_properties_search
  ON properties(is_active, dong, trade_type_name, real_estate_type_name)
  INCLUDE (price, area2);

-- is_active + 최신순 정렬 (기본 정렬)
CREATE INDEX IF NOT EXISTS idx_properties_active_lastseen
  ON properties(is_active, last_seen_at DESC);

-- is_active + 가격 정렬
CREATE INDEX IF NOT EXISTS idx_properties_active_price
  ON properties(is_active, price DESC);

-- 컬렉션 삭제 필터
CREATE INDEX IF NOT EXISTS idx_collections_is_deleted
  ON collections(is_deleted);

-- =============================================================
-- 2. 멀티유저: 기존 테이블에 user_id 추가
-- =============================================================

-- collections
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_collections_user_id
  ON collections(user_id);

-- customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON customers(user_id);

-- deals
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deals_user_id
  ON deals(user_id);

-- =============================================================
-- 3. 멀티유저: 개인 매물 데이터 분리 테이블
-- =============================================================

-- 유저별 매물 메모
CREATE TABLE IF NOT EXISTS user_memos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_user_memos_user_id ON user_memos(user_id);

-- 유저별 즐겨찾기
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

-- 유저별 내 매물
CREATE TABLE IF NOT EXISTS user_listings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS idx_user_listings_user_id ON user_listings(user_id);

-- =============================================================
-- 4. 유저 설정 테이블
-- =============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  page_size integer DEFAULT 50,
  yield_calc_method text DEFAULT 'deposit',
  default_dong text DEFAULT '전체',
  default_property_type text DEFAULT '전체',
  default_deal_type text DEFAULT '전체',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 5. RLS 정책: 유저별 데이터 격리
-- =============================================================

-- 기존 "allow all" 정책 제거 후 유저별 정책 추가
-- (properties는 공유 데이터라 SELECT만 열어두고, 개인 테이블은 유저 격리)

-- user_memos
ALTER TABLE user_memos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own memos" ON user_memos;
CREATE POLICY "Users manage own memos" ON user_memos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_favorites
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own favorites" ON user_favorites;
CREATE POLICY "Users manage own favorites" ON user_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_listings
ALTER TABLE user_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own listings" ON user_listings;
CREATE POLICY "Users manage own listings" ON user_listings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own settings" ON user_settings;
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- collections (유저별)
DROP POLICY IF EXISTS "Allow all on collections" ON collections;
DROP POLICY IF EXISTS "Users manage own collections" ON collections;
CREATE POLICY "Users manage own collections" ON collections
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- customers (유저별)
DROP POLICY IF EXISTS "Allow all on customers" ON customers;
DROP POLICY IF EXISTS "Users manage own customers" ON customers;
CREATE POLICY "Users manage own customers" ON customers
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- deals (유저별)
DROP POLICY IF EXISTS "Allow all on deals" ON deals;
DROP POLICY IF EXISTS "Users manage own deals" ON deals;
CREATE POLICY "Users manage own deals" ON deals
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
