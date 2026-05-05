#!/usr/bin/env python3
"""배포 전 필수 설정/서비스/API 상태를 빠르게 점검하는 스크립트."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


REQUIRED_ENV_KEYS = [
    "SECRET_KEY",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "REDIS_URL",
    "NEXT_PUBLIC_API_URL",
]

RECOMMENDED_ENV_KEYS = [
    "COUPANG_ACCESS_KEY",
    "COUPANG_SECRET_KEY",
    "COUPANG_VENDOR_ID",
    "NOTIFICATION_EMAIL_FROM",
    "NOTIFICATION_KAKAO_WEBHOOK_URL",
    "NOTIFICATION_SMS_WEBHOOK_URL",
]


def check_env() -> int:
    print("[1/3] 환경변수 점검")
    env_map = _load_env_map()
    missing_required = [key for key in REQUIRED_ENV_KEYS if not env_map.get(key)]
    missing_recommended = [key for key in RECOMMENDED_ENV_KEYS if not env_map.get(key)]

    if missing_required:
        print(f"  - 필수 누락: {', '.join(missing_required)}")
    else:
        print("  - 필수 항목 OK")

    if missing_recommended:
        print(f"  - 권장 누락: {', '.join(missing_recommended)}")
    else:
        print("  - 권장 항목 OK")

    return 1 if missing_required else 0


def _load_env_map() -> dict[str, str]:
    env_map = dict(os.environ)
    env_file = Path(__file__).resolve().parents[1] / ".env"
    if not env_file.exists():
        return env_map

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and key not in env_map:
            env_map[key] = value
    return env_map


def run_cmd(command: list[str]) -> tuple[int, str]:
    result = subprocess.run(command, capture_output=True, text=True)
    output = (result.stdout or "") + (result.stderr or "")
    return result.returncode, output.strip()


def check_containers() -> int:
    print("[2/3] 컨테이너 상태 점검")
    code, output = run_cmd(["docker", "compose", "ps"])
    if code != 0:
        print("  - docker compose ps 실패")
        print(output)
        return 1

    print(output)
    unhealthy = []
    for line in output.splitlines():
        if "backend" in line or "frontend" in line or "db" in line or "redis" in line:
            if "Up" not in line:
                unhealthy.append(line)
    if unhealthy:
        print("  - 비정상 컨테이너:")
        for line in unhealthy:
            print(f"    {line}")
        return 1
    print("  - 핵심 컨테이너 OK")
    return 0


def check_http(url: str) -> bool:
    try:
        with urlopen(url, timeout=5) as response:
            return 200 <= response.status < 400
    except URLError:
        return False


def check_endpoints(api_base: str, web_base: str) -> int:
    print("[3/3] 핵심 엔드포인트 점검")
    endpoints = [
        f"{api_base.rstrip('/')}/boards/",
        f"{api_base.rstrip('/')}/marketplace/",
        f"{api_base.rstrip('/')}/hotdeals/",
        f"{web_base.rstrip('/')}/",
        f"{web_base.rstrip('/')}/boards/free",
        f"{web_base.rstrip('/')}/products",
    ]

    failed = []
    for endpoint in endpoints:
        ok = check_http(endpoint)
        print(f"  - {'OK ' if ok else 'FAIL'} {endpoint}")
        if not ok:
            failed.append(endpoint)
    return 1 if failed else 0


def main():
    parser = argparse.ArgumentParser(description="배포 전 점검 스크립트")
    parser.add_argument("--api-base", default="http://127.0.0.1:8000/api/v1")
    parser.add_argument("--web-base", default="http://127.0.0.1:3100")
    args = parser.parse_args()

    failures = 0
    failures += check_env()
    failures += check_containers()
    failures += check_endpoints(args.api_base, args.web_base)

    if failures:
        print("\n결과: FAIL (점검 항목 보완 후 재실행)")
        raise SystemExit(1)

    print("\n결과: PASS (배포 진행 가능)")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
