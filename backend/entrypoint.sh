#!/bin/sh
set -e

# 웹 애플리케이션 컨테이너에서만 마이그레이션을 적용한다.
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  python manage.py migrate --noinput
fi

# 기본 계정/게시판 부트스트랩을 자동으로 맞춘다(멱등 실행).
if [ "${RUN_BOOTSTRAP:-0}" = "1" ]; then
  python manage.py bootstrap_community
fi

exec "$@"
