#!/usr/bin/env python3
"""알림 생성/채널 발송이력 저장을 검증하는 로컬 스크립트."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass
class Session:
    username: str
    token: str


class ValidationFailure(RuntimeError):
    pass


def unwrap_collection(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def request_json(
    method: str,
    url: str,
    *,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    as_form: bool = False,
) -> tuple[int, Any]:
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        if as_form:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            data = urlencode(payload, doseq=True).encode("utf-8")
        else:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(url, data=data, headers=headers, method=method.upper())

    try:
        with urlopen(request, timeout=30) as response:
            body = response.read().decode()
            return response.status, json.loads(body) if body else None
    except HTTPError as error:
        body = error.read().decode()
        try:
            parsed = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed = {"detail": body}
        return error.code, parsed


def ensure(condition: bool, message: str):
    if not condition:
        raise ValidationFailure(message)


def login(base_url: str, username: str, password: str) -> Session:
    status, payload = request_json(
        "POST",
        f"{base_url}/auth/login/",
        payload={"username": username, "password": password},
    )
    ensure(status == 200 and payload and payload.get("access"), f"{username} 로그인 실패: {payload}")
    return Session(username=username, token=payload["access"])


def main():
    parser = argparse.ArgumentParser(description="알림 채널 발송이력 검증")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api/v1")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    print("[1/6] 로그인")
    seller = login(base_url, "sell", "sell")
    buyer = login(base_url, "buy", "buy")

    print("[2/6] 판매자 알림 채널 설정")
    pref_payload = {
        "allow_in_app": True,
        "allow_email": True,
        "allow_kakao": True,
        "allow_sms": True,
        "email": "seller@example.com",
        "kakao_target": "kakao-user-sell",
        "phone_number": "+821012340000",
        "quiet_hours_start": 23,
        "quiet_hours_end": 8,
    }
    status, pref = request_json("PATCH", f"{base_url}/notifications/preferences/", token=seller.token, payload=pref_payload)
    ensure(status == 200, f"알림 설정 실패: {pref}")

    print("[3/6] 판매자 게시글 생성")
    post_payload = {"title": "[NOTI-TEST] 채널 검증", "content": "구매자 댓글로 알림 생성 테스트"}
    status, post = request_json(
        "POST",
        f"{base_url}/boards/free/posts/",
        token=seller.token,
        payload=post_payload,
        as_form=True,
    )
    ensure(status == 201 and post and post.get("id"), f"게시글 생성 실패: {post}")
    post_id = post["id"]

    print("[4/6] 구매자 댓글 작성(판매자 알림 트리거)")
    comment_payload = {"content": "[NOTI-TEST] 댓글 트리거", "parent": None}
    status, comment = request_json("POST", f"{base_url}/posts/{post_id}/comments/", token=buyer.token, payload=comment_payload)
    ensure(status == 201, f"댓글 작성 실패: {comment}")

    print("[5/6] 판매자 알림 목록 조회")
    status, notifications = request_json("GET", f"{base_url}/notifications/", token=seller.token)
    notification_list = unwrap_collection(notifications)
    ensure(status == 200 and notification_list, f"알림 목록 조회 실패: {notifications}")
    latest_notification = notification_list[0]

    print("[6/6] 판매자 알림 발송이력 조회")
    status, deliveries = request_json(
        "GET",
        f"{base_url}/notifications/deliveries/?notification_id={latest_notification['id']}",
        token=seller.token,
    )
    delivery_list = unwrap_collection(deliveries)
    ensure(status == 200 and delivery_list, f"발송이력 조회 실패: {deliveries}")

    channels = {(entry.get("channel"), entry.get("status")) for entry in delivery_list}
    ensure(any(channel == "in_app" for channel, _ in channels), "in_app 발송이력이 없습니다.")
    ensure(any(channel == "email" for channel, _ in channels), "email 발송이력이 없습니다.")
    ensure(any(channel == "kakao" for channel, _ in channels), "kakao 발송이력이 없습니다.")
    ensure(any(channel == "sms" for channel, _ in channels), "sms 발송이력이 없습니다.")

    print("\n검증 완료")
    print(f"- 생성 게시글 ID: {post_id}")
    print(f"- 생성 알림 ID: {latest_notification['id']}")
    print("- 채널별 발송이력(in_app/email/kakao/sms) 생성 확인")
    print("- 외부 웹훅 미설정 환경에서는 kakao/sms/email이 skipped 또는 failed일 수 있습니다.")


if __name__ == "__main__":
    try:
        main()
    except ValidationFailure as error:
        print(f"\n실패: {error}", file=sys.stderr)
        raise SystemExit(1)
