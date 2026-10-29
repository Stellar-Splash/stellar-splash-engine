#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HEALTH_URL="http://localhost:${PORT}/api/health"

echo "Checking engine health probe at ${HEALTH_URL}..."

RESPONSE=$(curl -fsS --max-time 3 "${HEALTH_URL}")

if [ -z "$RESPONSE" ]; then
  echo "❌ Health check failed: Empty response"
  exit 1
fi

STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"')

if [ "$STATUS" != "ok" ]; then
  echo "❌ Engine reported non-ok status: $STATUS"
  exit 1
fi

echo "✅ Engine health probe OK (status=$STATUS)"
