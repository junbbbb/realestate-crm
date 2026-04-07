-- =============================================================
-- PIN 유저(0641)도 자기 데이터에 접근 가능하도록 RLS 수정
-- PIN 유저는 Supabase Auth 세션 없이 anon key로 접근하므로
-- auth.uid()가 null. 따라서 PIN UUID를 명시적으로 허용.
-- =============================================================

-- user_memos
DROP POLICY IF EXISTS "Users manage own memos" ON user_memos;
CREATE POLICY "Users manage own memos" ON user_memos
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');

-- user_favorites
DROP POLICY IF EXISTS "Users manage own favorites" ON user_favorites;
CREATE POLICY "Users manage own favorites" ON user_favorites
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');

-- user_listings
DROP POLICY IF EXISTS "Users manage own listings" ON user_listings;
CREATE POLICY "Users manage own listings" ON user_listings
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');

-- user_settings
DROP POLICY IF EXISTS "Users manage own settings" ON user_settings;
CREATE POLICY "Users manage own settings" ON user_settings
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');

-- collections (이미 user_id 매칭만 있음 — PIN 유저도 추가)
DROP POLICY IF EXISTS "Users own collections" ON collections;
CREATE POLICY "Users own collections" ON collections
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');

-- customers
DROP POLICY IF EXISTS "Users own customers" ON customers;
CREATE POLICY "Users own customers" ON customers
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');

-- deals
DROP POLICY IF EXISTS "Users own deals" ON deals;
CREATE POLICY "Users own deals" ON deals
  FOR ALL
  USING (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21')
  WITH CHECK (auth.uid() = user_id OR user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21');
