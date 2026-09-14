#!/usr/bin/env bash
# Gửi 1 command test EMAIL vào notification.commands.v1 để trigger notification service.
# Usage: ./scripts/send-test-notification.sh <email>
set -euo pipefail

RECIPIENT="${1:-}"
if [ -z "$RECIPIENT" ]; then
  echo "Usage: $0 <email>" >&2
  exit 1
fi

EVENT_ID="test-email-$(date +%s)"
OCCURRED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

JSON=$(cat <<EOF
{"event_id":"$EVENT_ID","schema_version":1,"command_type":"AUTH_VERIFICATION_REQUESTED","occurred_at":"$OCCURRED_AT","dedupe_key":"test:email:$EVENT_ID","user_id":"user-1","channel":"EMAIL","recipient":"$RECIPIENT","template":"auth-email-verification-v1","data":{"display_name":"Test User","verification_code":"123456","verification_url":"https://taca.vn/verify?t=abc","expires_in_minutes":30}}
EOF
)

echo "$JSON" | docker compose exec -T kafka /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic notification.commands.v1
echo "Đã gửi EMAIL tới $RECIPIENT (event_id=$EVENT_ID, template=auth-email-verification-v1)"
