from abc import ABC, abstractmethod
from typing import List, Dict, Any
import uuid
import urllib.request
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


class ProductSourcingProvider(ABC):
    """외부 상품 소싱 Provider 추상 클래스 (1차: Mock만 구현)"""

    @abstractmethod
    def search(self, keyword: str, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        pass

    def download_image_to_media(self, external_url: str, prefix: str = "boards/inline") -> str | None:
        """외부 이미지 다운로드 후 내부 media에 저장. 성공 시 /media/... 경로 반환"""
        if not external_url:
            return None
        try:
            req = urllib.request.Request(
                external_url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; MYPPLBot/1.0)"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                if len(data) > 8 * 1024 * 1024:
                    return None
                content_type = resp.headers.get("Content-Type", "")
                ext = "jpg"
                if "png" in content_type:
                    ext = "png"
                elif "webp" in content_type:
                    ext = "webp"
                filename = f"{prefix}/{uuid.uuid4().hex[:12]}.{ext}"
                saved_name = default_storage.save(filename, ContentFile(data))
                return f"/media/{saved_name}"
        except Exception:
            return None


class MockProductSourcingProvider(ProductSourcingProvider):
    """1차 구현용 Mock Provider. 실제 API 연동 전 테스트용"""

    def search(self, keyword: str, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        base = (keyword or "테스트상품").strip()
        results = []
        for i in range(min(limit, 12)):
            idx = (page - 1) * limit + i + 1
            price = 15000 + (idx * 1700)
            results.append({
                "external_id": f"mock-{base[:10]}-{idx}",
                "provider": "mock",
                "title": f"{base} {idx}번 상품",
                "image_url": f"https://picsum.photos/seed/{base[:5]}-{idx}/400/400",
                "product_url": f"https://example.com/product/{idx}",
                "store_name": "테스트쇼핑",
                "original_price": price + 5000,
                "sale_price": price,
                "category": "디지털/액세서리",
            })
        return results
