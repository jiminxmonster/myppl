#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-local-nginx}"

case "$TARGET" in
  local-frontend)
    BASE_URL="${BASE_URL:-http://localhost:3100}"
    API_URL="${API_URL:-http://localhost:8000/api/v1}"
    ;;
  local-nginx)
    BASE_URL="${BASE_URL:-http://localhost:8080}"
    API_URL="${API_URL:-http://localhost:8080/api/v1}"
    ;;
  vm)
    BASE_URL="${BASE_URL:-http://34.22.96.236:8080}"
    API_URL="${API_URL:-http://34.22.96.236:8080/api/v1}"
    ;;
  *)
    echo "Usage: $0 [local-frontend|local-nginx|vm]" >&2
    exit 2
    ;;
esac

echo "[auth-harness] target=$TARGET"
echo "[auth-harness] base=$BASE_URL"
echo "[auth-harness] api=$API_URL"

echo "[1/5] Login page HTTP check"
login_code="$(curl -sS -o /tmp/myppl-login-page.html -w "%{http_code}" "$BASE_URL/login" || true)"
echo "  - $BASE_URL/login -> HTTP $login_code"
if [[ "$login_code" != "200" ]]; then
  echo "Login page is not reachable." >&2
  exit 1
fi

echo "[2/5] API login check for test accounts"
python3 - "$API_URL" <<'PY'
import json
import sys
import urllib.error
import urllib.request

api_url = sys.argv[1].rstrip("/")
accounts = [("admin", "admin"), ("buy", "buy"), ("sell", "sell")]
failed = False

for username, password in accounts:
    request = urllib.request.Request(
        f"{api_url}/auth/login/",
        data=json.dumps({"username": username, "password": password}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        response = urllib.request.urlopen(request, timeout=10)
        payload = json.load(response)
        ok = response.status == 200 and bool(payload.get("access"))
        print(f"  - {username}/{password}: HTTP {response.status}, access={bool(payload.get('access'))}, user={payload.get('user', {}).get('username')}")
        failed = failed or not ok
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", "replace")[:300]
        print(f"  - {username}/{password}: HTTP {error.code}, body={body}")
        failed = True
    except Exception as error:
        print(f"  - {username}/{password}: {type(error).__name__}: {error}")
        failed = True

if failed:
    raise SystemExit(1)
PY

echo "[3/5] Frontend API target sanity check"
if grep -q "http://localhost:8000/api/v1" /tmp/myppl-login-page.html && [[ "$TARGET" == "vm" ]]; then
  echo "VM login page contains localhost API target. Frontend build is stale or misconfigured." >&2
  exit 1
fi
echo "  - static HTML check passed"

echo "[4/5] Docker compose runtime check"
if [[ "$TARGET" == local-* ]]; then
  if command -v docker >/dev/null 2>&1; then
    docker compose ps frontend backend nginx || true
    frontend_status="$(docker ps --filter name=comunitysite-frontend-1 --format '{{.Status}}' || true)"
    echo "  - frontend: ${frontend_status:-not found}"
    if [[ "$frontend_status" == *"Restarting"* ]]; then
      echo "Frontend container is restarting. Check .next build and volume masking." >&2
      exit 1
    fi
  fi
else
  if command -v gcloud >/dev/null 2>&1; then
    gcloud compute ssh myppl-vm --zone asia-northeast3-a --command \
      'cd ~/comunitysite && docker compose ps frontend backend nginx && docker compose exec -T frontend printenv | grep -E "NEXT_PUBLIC_API_URL|NEXT_INTERNAL_API_URL" || true'
  else
    echo "  - gcloud not found; skipped VM docker check"
  fi
fi

echo "[5/5] Required manual browser check"
echo "  - Open $BASE_URL/login"
echo "  - Hard refresh"
echo "  - Confirm API target is correct"
echo "  - Login with admin/admin once"

echo "[auth-harness] OK"
