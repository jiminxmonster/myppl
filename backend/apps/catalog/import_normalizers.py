import json
import re
from urllib.parse import parse_qs, urlparse


TITLE_CANDIDATE_KEYS = ("title", "name", "productName", "product_name", "itemName", "item_name")
DESCRIPTION_CANDIDATE_KEYS = ("description", "content", "detail", "detailContent", "summary")
PRICE_CANDIDATE_KEYS = ("sale_price", "salePrice", "price", "current_price", "discountPrice")
IMAGE_CANDIDATE_KEYS = ("image", "imageUrl", "image_url", "thumbnail", "thumbnailUrl", "representImage")


def find_first_value(payload, keys):
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in keys and value not in (None, "", [], {}):
                return value
            nested = find_first_value(value, keys)
            if nested not in (None, "", [], {}):
                return nested
    elif isinstance(payload, list):
        for value in payload:
            nested = find_first_value(value, keys)
            if nested not in (None, "", [], {}):
                return nested
    return None


def unwrap_primary_payload(payload):
    if not isinstance(payload, dict):
        return payload

    for key in ("data", "product", "item", "content", "result"):
        value = payload.get(key)
        if isinstance(value, dict):
            return value
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return value[0]
    return payload


def extract_coupang_reference(reference):
    if not reference:
        return ""

    trimmed = reference.strip()
    if trimmed.isdigit():
        return trimmed

    if "://" not in trimmed:
        return trimmed

    parsed = urlparse(trimmed)
    query = parse_qs(parsed.query)
    for key in ("productId", "productid", "itemId", "vendorItemId", "vendoritemid"):
        values = query.get(key)
        if values and values[0]:
            return values[0]

    product_match = re.search(r"/products/(\d+)", parsed.path)
    if product_match:
        return product_match.group(1)

    vendor_match = re.search(r"vendorItemId=(\d+)", trimmed)
    if vendor_match:
        return vendor_match.group(1)

    return trimmed


def build_generic_preview(provider, category, reference, payload, option_snapshot):
    title = find_first_value(payload, TITLE_CANDIDATE_KEYS) or f"{provider.name if provider else '외부'} 연동 상품 {reference or '미리보기'}"
    description = find_first_value(payload, DESCRIPTION_CANDIDATE_KEYS) or "외부 연동 미리보기로 불러온 상품 설명입니다. 등록 전에 내용을 검토하고 수정할 수 있습니다."
    price_value = find_first_value(payload, PRICE_CANDIDATE_KEYS)
    if isinstance(price_value, (dict, list)):
        price_value = ""
    image_value = find_first_value(payload, IMAGE_CANDIDATE_KEYS)
    if isinstance(image_value, list):
        image_value = next((item for item in image_value if isinstance(item, str)), "")

    return {
        "title": str(title),
        "description": str(description),
        "price": str(price_value or ""),
        "region": "전국",
        "external_image_url": str(image_value or ""),
        "source_mode": "imported",
        "external_reference": reference,
        "external_payload": payload,
        "option_snapshot": option_snapshot,
        "product_category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        }
        if category
        else None,
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "code": provider.code,
        }
        if provider
        else None,
    }


def normalize_coupang_preview(provider, category, reference, payload, option_snapshot):
    primary = unwrap_primary_payload(payload)
    normalized_reference = (
        extract_coupang_reference(reference)
        or find_first_value(primary, ("vendorItemId", "itemId", "productId", "sellerProductId"))
        or reference
    )

    title = (
        find_first_value(primary, ("displayProductName", "vendorItemName", "itemName", "productName", "title"))
        or f"쿠팡 연동 상품 {normalized_reference or '미리보기'}"
    )
    sale_price = find_first_value(primary, ("salePrice", "discountPrice", "currentPrice", "price"))
    original_price = find_first_value(primary, ("originalPrice", "originPrice", "listPrice"))
    image_value = find_first_value(
        primary,
        (
            "representImage",
            "imageUrl",
            "vendorItemImage",
            "productImage",
            "thumbnail",
            "thumbnailImage",
        ),
    )

    brand = find_first_value(primary, ("brand", "brandName", "vendorBrand"))
    seller_name = find_first_value(primary, ("vendorName", "sellerName", "seller"))
    shipping = find_first_value(primary, ("shippingType", "deliveryType", "delivery"))
    summary = find_first_value(primary, ("description", "itemDescription", "summary", "content"))

    if isinstance(image_value, list):
        image_value = next((item for item in image_value if isinstance(item, str)), "")

    description_parts = []
    if summary:
        description_parts.append(str(summary))
    if brand:
        description_parts.append(f"브랜드: {brand}")
    if seller_name:
        description_parts.append(f"판매처: {seller_name}")
    if original_price:
        description_parts.append(f"정가: {original_price}")
    if shipping:
        description_parts.append(f"배송정보: {shipping}")
    if normalized_reference:
        description_parts.append(f"쿠팡 참조코드: {normalized_reference}")

    description = "\n".join(description_parts) if description_parts else "쿠팡 상품 정보를 불러왔습니다. 등록 전에 제목과 설명을 검토해 주세요."

    return {
        "title": str(title),
        "description": description,
        "price": str(sale_price or original_price or ""),
        "region": "전국",
        "external_image_url": str(image_value or ""),
        "source_mode": "imported",
        "external_reference": str(normalized_reference or ""),
        "external_payload": payload,
        "option_snapshot": {
            **option_snapshot,
            "__external_provider_code": "coupang",
            "__normalized_source": "coupang",
        },
        "product_category": {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        }
        if category
        else None,
        "provider": {
            "id": provider.id,
            "name": provider.name,
            "code": provider.code,
        }
        if provider
        else None,
    }


def normalize_external_import_preview(provider, category, reference, payload, option_snapshot):
    provider_code = getattr(provider, "code", "")
    if provider_code == "coupang":
        return normalize_coupang_preview(provider, category, reference, payload, option_snapshot)
    return build_generic_preview(provider, category, reference, payload, option_snapshot)


def build_haystack(reference, payload):
    return f"{reference} {json.dumps(payload, ensure_ascii=False)}".lower()
