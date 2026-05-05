"""쿠팡 판매자 Open API 연동 커넥터."""

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen

from django.conf import settings


class CoupangConnectorError(Exception):
    """쿠팡 연동 공통 예외."""


class CoupangConfigurationError(CoupangConnectorError):
    """쿠팡 키 설정 누락 예외."""


class CoupangFetchError(CoupangConnectorError):
    """쿠팡 원격 조회 실패 예외."""


@dataclass
class CoupangReference:
    reference_type: str
    value: str


@dataclass
class CoupangConnector:
    access_key: str
    secret_key: str
    vendor_id: str
    base_url: str

    REFERENCE_SELLER_PRODUCT_ID = "seller_product_id"
    REFERENCE_EXTERNAL_VENDOR_SKU = "external_vendor_sku"
    PRODUCT_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/{seller_product_id}"
    EXTERNAL_VENDOR_SKU_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/external-vendor-sku-codes/{external_vendor_sku}"

    @classmethod
    def from_settings(cls, provider: Any | None = None) -> "CoupangConnector":
        access_key = getattr(settings, "COUPANG_ACCESS_KEY", "")
        secret_key = getattr(settings, "COUPANG_SECRET_KEY", "")
        vendor_id = getattr(settings, "COUPANG_VENDOR_ID", "")
        base_url = getattr(settings, "COUPANG_BASE_URL", "") or "https://api-gateway.coupang.com"

        if provider is not None and getattr(provider, "base_url", ""):
            base_url = provider.base_url

        missing = []
        if not access_key:
            missing.append("COUPANG_ACCESS_KEY")
        if not secret_key:
            missing.append("COUPANG_SECRET_KEY")
        if not vendor_id:
            missing.append("COUPANG_VENDOR_ID")

        if missing:
            joined = ", ".join(missing)
            raise CoupangConfigurationError(
                f"쿠팡 실연동을 사용하려면 환경변수 {joined} 설정이 필요합니다."
            )

        return cls(
            access_key=access_key,
            secret_key=secret_key,
            vendor_id=vendor_id,
            base_url=base_url.rstrip("/"),
        )

    def fetch_product_payload(self, reference: str) -> dict[str, Any]:
        reference_info = self.resolve_reference(reference)
        if reference_info.reference_type == self.REFERENCE_SELLER_PRODUCT_ID:
            return self.get_product_by_seller_product_id(reference_info.value)

        summary_payload = self.get_product_summary_by_external_vendor_sku(reference_info.value)
        summary_data = summary_payload.get("data") or []
        first_summary = summary_data[0] if isinstance(summary_data, list) and summary_data else summary_data
        seller_product_id = ""
        if isinstance(first_summary, dict):
            seller_product_id = str(first_summary.get("sellerProductId") or "").strip()

        if seller_product_id.isdigit():
            return self.get_product_by_seller_product_id(seller_product_id)

        return summary_payload

    def resolve_reference(self, reference: str) -> CoupangReference:
        trimmed = (reference or "").strip()
        if not trimmed:
            raise CoupangFetchError(
                "쿠팡 상품을 불러오려면 sellerProductId, externalVendorSku 또는 해당 값이 포함된 URL이 필요합니다."
            )

        if trimmed.isdigit():
            return CoupangReference(self.REFERENCE_SELLER_PRODUCT_ID, trimmed)

        if "://" not in trimmed:
            return CoupangReference(self.REFERENCE_EXTERNAL_VENDOR_SKU, trimmed)

        parsed = urlparse(trimmed)
        query = parse_qs(parsed.query)
        seller_product_values = query.get("sellerProductId") or query.get("sellerproductid")
        if seller_product_values and seller_product_values[0]:
            return CoupangReference(self.REFERENCE_SELLER_PRODUCT_ID, seller_product_values[0])

        external_sku_values = query.get("externalVendorSku") or query.get("externalVendorSkuCode")
        if external_sku_values and external_sku_values[0]:
            return CoupangReference(self.REFERENCE_EXTERNAL_VENDOR_SKU, external_sku_values[0])

        path_parts = [part for part in parsed.path.split("/") if part]
        if "seller-products" in path_parts:
            index = path_parts.index("seller-products")
            if len(path_parts) > index + 1 and path_parts[index + 1].isdigit():
                return CoupangReference(self.REFERENCE_SELLER_PRODUCT_ID, path_parts[index + 1])
            if len(path_parts) > index + 2 and path_parts[index + 1] == "external-vendor-sku-codes":
                return CoupangReference(self.REFERENCE_EXTERNAL_VENDOR_SKU, path_parts[index + 2])

        raise CoupangFetchError(
            "쿠팡 판매자 API는 sellerProductId 또는 externalVendorSku 기준 조회를 권장합니다. "
            "현재 입력값에서는 해당 참조값을 찾지 못했습니다."
        )

    def get_product_by_seller_product_id(self, seller_product_id: str) -> dict[str, Any]:
        if not seller_product_id.isdigit():
            raise CoupangFetchError("sellerProductId는 숫자만 입력할 수 있습니다.")

        path = self.PRODUCT_PATH.format(seller_product_id=seller_product_id)
        return self._request_json("GET", path)

    def get_product_summary_by_external_vendor_sku(self, external_vendor_sku: str) -> dict[str, Any]:
        if not external_vendor_sku:
            raise CoupangFetchError("externalVendorSku 값이 비어 있습니다.")

        encoded_sku = quote(external_vendor_sku, safe="")
        path = self.EXTERNAL_VENDOR_SKU_PATH.format(external_vendor_sku=encoded_sku)
        return self._request_json("GET", path)

    def _request_json(self, method: str, path: str, query_params: dict[str, Any] | None = None) -> dict[str, Any]:
        query_string = urlencode(query_params or {}, doseq=True)
        authorization = self._build_authorization(method, path, query_string)
        url = f"{self.base_url}{path}"
        if query_string:
            url = f"{url}?{query_string}"

        request = Request(
            url,
            headers={
                "Authorization": authorization,
                "Content-Type": "application/json;charset=UTF-8",
                "Accept": "application/json",
                "X-Requested-By": self.vendor_id,
                "X-EXTENDED-TIMEOUT": "90000",
            },
            method=method.upper(),
        )

        try:
            with urlopen(request, timeout=20) as response:
                body = response.read().decode(response.headers.get_content_charset() or "utf-8")
        except HTTPError as error:
            body = error.read().decode("utf-8", "ignore")
            message = self._extract_error_message(body) or f"HTTP {error.code}"
            raise CoupangFetchError(f"쿠팡 상품 조회에 실패했습니다. {message}") from error
        except URLError as error:
            raise CoupangFetchError(f"쿠팡 API 연결에 실패했습니다. {error.reason}") from error

        if not body:
            return {}

        try:
            return json.loads(body)
        except json.JSONDecodeError as error:
            raise CoupangFetchError("쿠팡 API 응답을 JSON으로 해석하지 못했습니다.") from error

    def _build_authorization(self, method: str, path: str, query_string: str) -> str:
        signed_date = datetime.now(timezone.utc).strftime("%y%m%dT%H%M%SZ")
        message = f"{signed_date}{method.upper()}{path}{query_string}"
        signature = hmac.new(
            self.secret_key.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return (
            "CEA algorithm=HmacSHA256, "
            f"access-key={self.access_key}, "
            f"signed-date={signed_date}, "
            f"signature={signature}"
        )

    def _extract_error_message(self, body: str) -> str:
        if not body:
            return ""
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return body.strip()

        if isinstance(payload, dict):
            for key in ("message", "errorMessage", "reason"):
                value = payload.get(key)
                if value:
                    return str(value)
        return body.strip()
