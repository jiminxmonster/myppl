#!/bin/sh
set -e

# 웹 애플리케이션 컨테이너에서만 마이그레이션을 적용한다.
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  python manage.py migrate --noinput
fi

# 부트스트랩은 RUN_BOOTSTRAP=1 로 명시적 강제할 때만 실행.
#
# MYPPL 운영 철학 (2026-06 이후)
# - GitHub = 코드 원본
# - PostgreSQL = 데이터 원본 (모든 운영 데이터)
# - Admin panel = 운영 원본 (메뉴, Hero, Section, 카테고리, 설정 등)
#
# bootstrap_community 는 **최초 설치 / 빈 DB / 재해복구** 용도로만 사용.
# 운영 중인 DB의 어떤 데이터도 UPDATE하지 않는다.
#
# RUN_BOOTSTRAP=1 은 오직 최초 셋업 또는 명시적 리셋이 필요할 때만 수동 주입.
if [ "${RUN_BOOTSTRAP:-0}" = "1" ]; then
  python manage.py bootstrap_community
fi

# One-time command support for maintenance on Cloud Run (e.g. password reset on temp service).
# Set env RUN_ONCE_COMMAND="bootstrap_community" (or other manage.py subcommand) and deploy/update
# a revision (preferably --no-traffic). The container will execute it using the service's existing
# Cloud SQL connection + envs, then exit. Follow up by clearing the env var.
if [ -n "${RUN_ONCE_COMMAND:-}" ]; then
  echo "RUN_ONCE_COMMAND detected → running: python manage.py ${RUN_ONCE_COMMAND}"
  python manage.py ${RUN_ONCE_COMMAND}
  echo "One-time command finished. Container will now exit."
  exit 0
fi

exec "$@"
