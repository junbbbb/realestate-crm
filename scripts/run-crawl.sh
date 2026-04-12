#!/usr/bin/env bash
# 마포구 상업용 매물 일일 크롤링 래퍼.
#
# 순서:
#   1. Chrome Default 프로파일에서 네이버 쿠키 자동 추출 → .env.local
#   2. crawl-mapo-fin.py 실행 → data/crawled-mapo-fin-YYYY-MM-DD.json
#   3. 실행 로그를 data/crawl-logs/ 에 저장
#
# 사용법:
#   bash scripts/run-crawl.sh
#
# cron 등록 예 (매일 오전 6시):
#   0 6 * * * cd /Users/lbj/realestate-crm && bash scripts/run-crawl.sh >> data/crawl-logs/cron.log 2>&1

set -euo pipefail
cd "$(dirname "$0")/.."

TS=$(date +%Y-%m-%d_%H%M%S)
mkdir -p data/crawl-logs
LOG="data/crawl-logs/${TS}-mapo.log"

echo "=== [$(date)] 크롤링 시작 ===" | tee -a "$LOG"

# 1. 쿠키 갱신
python3 scripts/extract-naver-cookie.py 2>&1 | tee -a "$LOG"

# 2. 크롤링
python3 scripts/crawl-mapo-fin.py 2>&1 | tee -a "$LOG"
EXIT_CODE=${PIPESTATUS[0]}

if [ "$EXIT_CODE" -ne 0 ]; then
  echo "=== [$(date)] 크롤링 실패 (exit=$EXIT_CODE) ===" | tee -a "$LOG"
  exit $EXIT_CODE
fi

# 3. Supabase 동기화 (가격 트래킹 포함)
JSON=$(ls -t data/crawled-mapo-fin-*.json | head -1)
echo "=== [$(date)] Supabase 동기화 시작: $JSON ===" | tee -a "$LOG"
python3 scripts/sync-to-supabase.py "$JSON" 2>&1 | tee -a "$LOG"
SYNC_CODE=${PIPESTATUS[0]}

echo "=== [$(date)] 완료 (crawl=0, sync=$SYNC_CODE) ===" | tee -a "$LOG"
exit $SYNC_CODE
