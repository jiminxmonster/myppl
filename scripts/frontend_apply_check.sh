#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] frontend 이미지 재빌드/재기동"
docker compose up -d --build frontend

echo "[2/4] frontend 컨테이너 상태 확인"
for _ in {1..45}; do
  STATUS="$(docker ps --filter name=comunitysite-frontend-1 --format '{{.Status}}' || true)"
  if [[ "$STATUS" == *"healthy"* ]]; then
    echo "  - status: $STATUS"
    break
  fi
  sleep 2
done
echo "  - current status: $(docker ps --filter name=comunitysite-frontend-1 --format '{{.Status}}' || true)"

echo "[3/4] 주요 관리자 URL 응답 확인"
URLS=(
  "http://localhost:3100/admin-panel/boards"
  "http://localhost:3100/admin-panel/product-menus"
  "http://localhost:3100/admin-panel/contents"
  "http://localhost:3100/admin-panel/posts"
)

for url in "${URLS[@]}"; do
  code="000"
  for _ in {1..10}; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$code" != "000" ]]; then
      break
    fi
    sleep 1
  done
  echo "  - $url -> HTTP $code"
done

echo "[4/4] 안내"
echo "  브라우저에서 Cmd+Shift+R(강력 새로고침) 후 화면 변경을 확인하세요."
