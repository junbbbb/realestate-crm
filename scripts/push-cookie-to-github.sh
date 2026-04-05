#!/usr/bin/env bash
# 로컬 Chrome에서 네이버 쿠키를 추출해 GitHub Actions secret 에 업로드.
#
# 네이버 NID 세션은 보통 수 주 단위로 만료된다. 만료되면 GitHub Actions 크롤링이
# 실패한다. 그때 Chrome에서 네이버에 재로그인한 뒤 이 스크립트를 실행하면 된다.
#
# 사전 요구:
#   - gh CLI 로그인 (gh auth status)
#   - Chrome Default 프로파일이 fin.land.naver.com 에 로그인돼 있어야 함
#   - macOS (Keychain 복호화 때문에)

set -euo pipefail
cd "$(dirname "$0")/.."

# 1. 쿠키 추출 → .env.local
python3 scripts/extract-naver-cookie.py

# 2. .env.local 에서 NAVER_COOKIE 라인만 뽑아내기
COOKIE=$(grep '^NAVER_COOKIE=' .env.local | sed 's/^NAVER_COOKIE=//')

if [ -z "$COOKIE" ]; then
  echo "error: .env.local에 NAVER_COOKIE가 없습니다." >&2
  exit 1
fi

echo "쿠키 길이: ${#COOKIE} bytes"

# 3. GitHub secret 업로드
echo -n "$COOKIE" | gh secret set NAVER_COOKIE

echo "✅ NAVER_COOKIE secret 업데이트 완료"
echo ""
echo "참고: Supabase 키는 최초 1회 수동 등록 필요"
echo "  gh secret set NEXT_PUBLIC_SUPABASE_URL"
echo "  gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY"
