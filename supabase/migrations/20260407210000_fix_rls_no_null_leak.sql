-- =============================================================
-- RLS 정책 수정: Google 유저에게 user_id=null 데이터 노출 차단
--
-- 기존: auth.uid() = user_id OR user_id IS NULL → 모든 유저가 null 봄
-- 수정: 인증 유저는 자기 것만, 비인증(PIN)은 null만
-- =============================================================

-- collections
DROP POLICY IF EXISTS "Users manage own collections" ON collections;
CREATE POLICY "Auth users own collections" ON collections
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon users see null collections" ON collections
  FOR ALL USING (user_id IS NULL AND auth.uid() IS NULL)
  WITH CHECK (user_id IS NULL AND auth.uid() IS NULL);

-- customers
DROP POLICY IF EXISTS "Users manage own customers" ON customers;
CREATE POLICY "Auth users own customers" ON customers
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon users see null customers" ON customers
  FOR ALL USING (user_id IS NULL AND auth.uid() IS NULL)
  WITH CHECK (user_id IS NULL AND auth.uid() IS NULL);

-- deals
DROP POLICY IF EXISTS "Users manage own deals" ON deals;
CREATE POLICY "Auth users own deals" ON deals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon users see null deals" ON deals
  FOR ALL USING (user_id IS NULL AND auth.uid() IS NULL)
  WITH CHECK (user_id IS NULL AND auth.uid() IS NULL);
