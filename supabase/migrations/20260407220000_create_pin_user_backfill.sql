-- =============================================================
-- PIN 사용자(0641)용 가짜 auth 유저 생성 + 기존 null 데이터 백필
-- =============================================================

-- 1. auth.users에 PIN 유저 삽입
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '02e4efdf-0453-5d57-ba66-dc6e9506bd21',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'pin-0641@realestate-crm.internal',
  '',
  now(),
  now(),
  now(),
  '{"full_name": "베스트공인중개 (PIN)", "name": "PIN 사용자"}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- 2. 기존 user_id=null 데이터를 PIN 유저에게 백필
UPDATE collections SET user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21' WHERE user_id IS NULL;
UPDATE customers SET user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21' WHERE user_id IS NULL;
UPDATE deals SET user_id = '02e4efdf-0453-5d57-ba66-dc6e9506bd21' WHERE user_id IS NULL;

-- 3. RLS 정책 수정 — null 분기 제거, 전부 user_id 매칭만
DROP POLICY IF EXISTS "Auth users own collections" ON collections;
DROP POLICY IF EXISTS "Anon users see null collections" ON collections;
CREATE POLICY "Users own collections" ON collections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users own customers" ON customers;
DROP POLICY IF EXISTS "Anon users see null customers" ON customers;
CREATE POLICY "Users own customers" ON customers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users own deals" ON deals;
DROP POLICY IF EXISTS "Anon users see null deals" ON deals;
CREATE POLICY "Users own deals" ON deals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_memos, user_favorites, user_listings, user_settings는 이미 auth.uid() = user_id 정책
