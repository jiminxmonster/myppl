#!/bin/bash

set -e

PROJECT_DIR="/Users/bannykick/Documents/work/comunitysite"
BACKEND_DIR="$PROJECT_DIR/backend"
PROXY_PORT=5432
INSTANCE_CONNECTION_NAME="myppl-495218:asia-northeast3:myppl-pg-temp"
PROXY_BINARY="$PROJECT_DIR/cloud-sql-proxy"

echo "=========================================="
echo "MYPPL Bootstrap Dump Helper (simplified)"
echo "=========================================="
echo ""

cd "$PROJECT_DIR"

# Make sure proxy binary exists
if [ ! -f "$PROXY_BINARY" ]; then
    echo "Downloading Cloud SQL Proxy..."
    curl -L -o "$PROXY_BINARY" https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.4/cloud-sql-proxy.darwin.arm64
    chmod +x "$PROXY_BINARY"
fi

echo "✅ gcloud OK (project: myppl-495218)"

echo ""
echo "DB 자격증명을 가져오는 중..."

# Try gcloud first
DB_NAME=$(gcloud secrets versions access latest --secret=DB_NAME 2>/dev/null || true)
DB_USER=$(gcloud secrets versions access latest --secret=DB_USER 2>/dev/null || true)
DB_PASSWORD=$(gcloud secrets versions access latest --secret=DB_PASSWORD 2>/dev/null || true)

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo ""
    echo "⚠️  gcloud로 Secret을 자동으로 가져올 수 없습니다."
    echo "GCP Console → Secret Manager에서 아래 3가지를 복사해 주세요."
    echo ""
    read -p "DB_NAME 값 붙여넣기: " DB_NAME
    read -p "DB_USER 값 붙여넣기: " DB_USER
    read -sp "DB_PASSWORD 값 붙여넣기 (화면에 안 보임): " DB_PASSWORD
    echo ""
fi

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ DB 자격증명이 필요합니다."
    exit 1
fi

echo "✅ DB 자격증명 준비 완료"

# Kill any old proxy on the port
echo "기존 proxy 정리 중..."
lsof -ti:$PROXY_PORT | xargs kill -9 2>/dev/null || true
sleep 1

# Start proxy using the local binary
echo "Cloud SQL Proxy 시작 중..."
"$PROXY_BINARY" "$INSTANCE_CONNECTION_NAME" --port $PROXY_PORT > /tmp/cloud_sql_proxy.log 2>&1 &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Wait for proxy to be ready
echo "Proxy 연결 대기 중 (최대 15초)..."
for i in {1..15}; do
    if nc -z 127.0.0.1 $PROXY_PORT 2>/dev/null; then
        echo "✅ Proxy 연결 성공!"
        break
    fi
    sleep 1
    if [ $i -eq 15 ]; then
        echo "❌ Proxy 연결 실패. 로그 확인: cat /tmp/cloud_sql_proxy.log"
        kill $PROXY_PID 2>/dev/null || true
        exit 1
    fi
done

echo ""
echo "Django dump_bootstrap_specs 실행 중..."
cd "$BACKEND_DIR"

# Try to activate venv if exists
if [ -f "$PROJECT_DIR/venv/bin/activate" ]; then
    source "$PROJECT_DIR/venv/bin/activate"
elif [ -f "$BACKEND_DIR/venv/bin/activate" ]; then
    source "$BACKEND_DIR/venv/bin/activate"
fi

export DB_HOST=127.0.0.1
export DB_PORT=$PROXY_PORT
export DB_NAME
export DB_USER
export DB_PASSWORD
export DJANGO_SETTINGS_MODULE=config.settings.production

if [ "$1" = "--bless" ]; then
    echo ""
    echo "🚀 --bless 모드: 현재 DB 상태를 bootstrap_community.py 에 직접 반영합니다."
    python manage.py dump_bootstrap_specs --bless
    echo ""
    echo "✅ bless 완료. 파일이 업데이트되었습니다."
    echo "git diff 확인 후 commit & backend redeploy 하세요."
else
    python manage.py dump_bootstrap_specs 2>&1 | tee /tmp/last_bootstrap_dump.txt

    echo ""
    echo "✅ 완료! 결과가 /tmp/last_bootstrap_dump.txt 에 저장되었습니다."
    echo ""
    echo "===== 아래 전체 내용을 복사해서 채팅에 붙여넣어 주세요 ====="
    cat /tmp/last_bootstrap_dump.txt
    echo "=========================================================="
fi

echo ""
echo "Proxy를 종료하려면: kill $PROXY_PID"
