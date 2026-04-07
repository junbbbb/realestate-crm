-- =============================================================
-- RLS 수정: PIN UUID 무조건 허용 → anon일 때만 허용
-- 기존: auth.uid() = user_id OR user_id = 'PIN_UUID' (모든 유저가 PIN 데이터 봄)
-- 수정: auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = 'PIN_UUID')
-- =============================================================

-- collections
DROP POLICY IF EXISTS "Users own collections" ON collections;
CREATE POLICY "Users own collections" ON collections
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));

-- customers
DROP POLICY IF EXISTS "Users own customers" ON customers;
CREATE POLICY "Users own customers" ON customers
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));

-- deals
DROP POLICY IF EXISTS "Users own deals" ON deals;
CREATE POLICY "Users own deals" ON deals
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));

-- user_memos
DROP POLICY IF EXISTS "Users manage own memos" ON user_memos;
CREATE POLICY "Users manage own memos" ON user_memos
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));

-- user_favorites
DROP POLICY IF EXISTS "Users manage own favorites" ON user_favorites;
CREATE POLICY "Users manage own favorites" ON user_favorites
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));

-- user_listings
DROP POLICY IF EXISTS "Users manage own listings" ON user_listings;
CREATE POLICY "Users manage own listings" ON user_listings
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));

-- user_settings
DROP POLICY IF EXISTS "Users manage own settings" ON user_settings;
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL
  USING (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'))
  WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21'));
