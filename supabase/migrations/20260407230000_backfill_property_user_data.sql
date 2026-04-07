-- =============================================================
-- properties 테이블의 is_favorite/is_my_listing/memo를
-- PIN 유저(0641)의 user_favorites/user_listings/user_memos로 이관
-- =============================================================

-- 즐겨찾기 이관
INSERT INTO user_favorites (user_id, property_id, created_at)
SELECT '02e4efdf-0453-5d57-ba66-dc6e9506bd21', id, now()
FROM properties
WHERE is_favorite = true
ON CONFLICT (user_id, property_id) DO NOTHING;

-- 내 매물 이관
INSERT INTO user_listings (user_id, property_id, created_at)
SELECT '02e4efdf-0453-5d57-ba66-dc6e9506bd21', id, now()
FROM properties
WHERE is_my_listing = true
ON CONFLICT (user_id, property_id) DO NOTHING;

-- 메모 이관
INSERT INTO user_memos (user_id, property_id, memo, updated_at)
SELECT '02e4efdf-0453-5d57-ba66-dc6e9506bd21', id, memo, now()
FROM properties
WHERE memo IS NOT NULL AND memo != ''
ON CONFLICT (user_id, property_id) DO UPDATE SET memo = EXCLUDED.memo;
