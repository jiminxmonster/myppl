#!/usr/bin/env python3
"""역할별 핵심 흐름을 한 번에 검수하는 API 스모크 하네스."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen


@dataclass
class Session:
    username: str
    token: str


class SmokeFailure(RuntimeError):
    pass


def unwrap_collection(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def request_json(method: str, url: str, *, token: str | None = None, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
    data = None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode()

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
        raise SmokeFailure(message)


def login(base_url: str, username: str, password: str) -> Session:
    status, payload = request_json(
        "POST",
        f"{base_url}/auth/login/",
        payload={"username": username, "password": password},
    )
    ensure(status == 200 and payload and payload.get("access"), f"{username} 로그인 실패: {payload}")
    return Session(username=username, token=payload["access"])


def main():
    parser = argparse.ArgumentParser(description="myppl 핵심 API 스모크 검증")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api/v1")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    print(f"[1/8] 로그인: {base_url}")
    admin = login(base_url, "admin", "admin")
    seller = login(base_url, "sell", "sell")
    buyer = login(base_url, "buy", "buy")

    print("[2/8] 카테고리 조회")
    status, categories = request_json("GET", f"{base_url}/catalog/categories/")
    ensure(status == 200 and categories, "상품 카테고리 조회 실패")
    product_category = categories[0]
    option_snapshot = {}
    for filter_item in product_category.get("filters", []):
        options = filter_item.get("options", [])
        if filter_item.get("filter_type") == "checkbox":
            option_snapshot[filter_item["slug"]] = [options[0]["label"]] if options else []
        elif filter_item.get("filter_type") == "single":
            option_snapshot[filter_item["slug"]] = options[0]["label"] if options else ""

    status, market_categories = request_json("GET", f"{base_url}/marketplace-categories/")
    ensure(status == 200 and market_categories, "중고장터 카테고리 조회 실패")
    market_category = market_categories[0]

    print("[3/8] 판매자 상품 등록")
    create_payload = {
        "title": "[SMOKE] 판매자 등록 상품",
        "description": "스모크 테스트용 판매상품입니다.",
        "category": market_category["id"],
        "product_category": product_category["id"],
        "price": "456000",
        "region": "서울",
        "status": "onsale",
        "source_mode": "manual",
        "option_snapshot": option_snapshot,
        "is_negotiable": True,
    }
    status, created_item = request_json("POST", f"{base_url}/marketplace/", token=seller.token, payload=create_payload)
    ensure(status == 201, f"판매자 상품 등록 실패: {created_item}")
    item_id = created_item["id"]
    ensure(created_item["approval_status"] == "pending", "등록 직후 approval_status가 pending이 아닙니다.")

    print("[4/8] 공개 목록에서 pending 숨김 확인")
    status, public_market = request_json("GET", f"{base_url}/marketplace/")
    ensure(status == 200, "공개 중고장터 조회 실패")
    public_market_items = unwrap_collection(public_market)
    ensure(all(item["id"] != item_id for item in public_market_items), "pending 상품이 공개 목록에 보입니다.")

    print("[5/8] 관리자 승인")
    status, approved_item = request_json(
        "PATCH",
        f"{base_url}/admin/marketplace-items/{item_id}/approval/",
        token=admin.token,
        payload={"approval_status": "approved", "approval_note": "스모크 승인"},
    )
    ensure(status == 200, f"관리자 승인 실패: {approved_item}")
    ensure(approved_item["approval_status"] == "approved", "승인 후 approval_status가 approved가 아닙니다.")

    print("[6/8] 승인 상품 공개 목록 노출 확인")
    status, public_market = request_json("GET", f"{base_url}/marketplace/")
    ensure(status == 200, "공개 중고장터 재조회 실패")
    public_market_items = unwrap_collection(public_market)
    ensure(any(item["id"] == item_id for item in public_market_items), "승인된 상품이 공개 목록에 보이지 않습니다.")

    print("[7/8] 구매자 원하는상품 등록")
    sub_payload = {
        "category": product_category["id"],
        "name": "[SMOKE] 원하는상품",
        "filters": option_snapshot,
        "keywords": [product_category["name"], "판매자"],
        "notify_events": ["match"],
        "channels": ["in_app", "email"],
        "is_active": True,
    }
    status, subscription = request_json("POST", f"{base_url}/catalog/subscriptions/", token=buyer.token, payload=sub_payload)
    ensure(status == 201, f"원하는상품 등록 실패: {subscription}")

    print("[8/8] 매칭 확인")
    status, matches = request_json("GET", f"{base_url}/catalog/subscriptions/matches/", token=buyer.token)
    ensure(status == 200 and isinstance(matches, list), f"매칭 조회 실패: {matches}")
    matched_item_ids = {item["id"] for group in matches for item in group.get("items", [])}
    ensure(item_id in matched_item_ids, "승인된 판매상품이 구매자 매칭 결과에 포함되지 않습니다.")

    print("\n검증 완료")
    print(f"- 판매 등록 상품 ID: {item_id}")
    print(f"- 원하는상품 ID: {subscription['id']}")
    print("- 판매자 등록 -> 관리자 승인 -> 공개 노출 -> 구매자 매칭 흐름 정상")


if __name__ == "__main__":
    try:
        main()
    except SmokeFailure as error:
        print(f"\n실패: {error}", file=sys.stderr)
        raise SystemExit(1)
