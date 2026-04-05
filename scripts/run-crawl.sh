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

echo "=== [$(date)] 크롤링 종료 (exit=$EXIT_CODE) ===" | tee -a "$LOG"
exit $EXIT_CODE
