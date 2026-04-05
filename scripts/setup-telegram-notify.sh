#!/usr/bin/env bash
# 텔레그램 알림 봇 세팅 도우미.
#
# 이 스크립트는:
#   1. Bot token과 chat_id를 대화형으로 입력받고
#   2. 테스트 메시지를 보내 검증한 뒤
#   3. GitHub Actions secret 에 TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 로 저장한다.
#
# 사전 요구:
#   - Telegram 앱에서 @BotFather 와 대화 → /newbot 으로 봇 생성 → token 받기
#   - 새로 만든 봇에게 아무 메시지나 한 번 보내기 (chat_id 받으려면 대화가 있어야 함)
#   - gh CLI 로그인 (gh auth status)

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== Telegram 알림 봇 세팅 ==="
echo ""
echo "준비: @BotFather → /newbot → 봇 만들고 token 복사"
echo "그리고 그 봇에게 텔레그램에서 '/start' 또는 아무 메시지 한 번 보내세요"
echo ""

read -rp "Telegram Bot Token: " TG_TOKEN
if [ -z "$TG_TOKEN" ]; then
  echo "error: token 비어있음" >&2; exit 1
fi

# chat_id 자동 추출
echo ""
echo "chat_id 조회 중..."
RESP=$(curl -sS "https://api.telegram.org/bot${TG_TOKEN}/getUpdates")
CHAT_ID=$(echo "$RESP" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if not data.get('ok'):
        print('ERR:' + data.get('description', 'unknown'))
        sys.exit(1)
    updates = data.get('result', [])
    if not updates:
        print('ERR:봇에게 메시지 보낸 적 없음. 텔레그램에서 봇에게 /start 입력 후 재실행')
        sys.exit(1)
    # 가장 최근 메시지의 chat id
    for u in reversed(updates):
        msg = u.get('message') or u.get('channel_post') or u.get('edited_message')
        if msg and 'chat' in msg:
            print(msg['chat']['id'])
            break
    else:
        print('ERR:chat 정보 없음')
        sys.exit(1)
except Exception as e:
    print(f'ERR:{e}')
    sys.exit(1)
")

if [[ "$CHAT_ID" == ERR:* ]]; then
  echo "${CHAT_ID#ERR:}" >&2
  exit 1
fi

echo "감지된 chat_id: $CHAT_ID"
echo ""

# 테스트 메시지 전송
echo "테스트 메시지 전송 중..."
curl -sS "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${CHAT_ID}" \
  --data-urlencode "text=✅ realestate-crm 알림 봇 연결 테스트 성공" > /dev/null

echo "텔레그램에서 테스트 메시지 확인해보세요."
read -rp "메시지 받으셨으면 Enter (아니면 Ctrl+C): "

# GitHub secret 등록
echo ""
echo "GitHub Actions secret 등록 중..."
echo -n "$TG_TOKEN" | gh secret set TELEGRAM_BOT_TOKEN
echo -n "$CHAT_ID" | gh secret set TELEGRAM_CHAT_ID

echo ""
echo "✅ 완료"
echo ""
echo "성공 시에도 알림 받고 싶으면 (실패만은 기본):"
echo "  gh variable set TELEGRAM_NOTIFY_SUCCESS -b true"
