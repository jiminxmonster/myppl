from django.conf import settings
from django.db import models


class MarketplaceCategory(models.Model):
    """중고장터 좌측 메뉴와 등록 분류에 쓰는 카테고리."""

    MENU_PLACEMENT_SALE = "sale"
    MENU_PLACEMENT_USED = "used"
    MENU_PLACEMENT_BOTH = "both"
    MENU_PLACEMENT_HIDDEN = "hidden"
    MENU_PLACEMENT_CHOICES = [
        (MENU_PLACEMENT_SALE, "판매상품"),
        (MENU_PLACEMENT_USED, "중고상품"),
        (MENU_PLACEMENT_BOTH, "둘 다 노출"),
        (MENU_PLACEMENT_HIDDEN, "노출 안 함"),
    ]

    name = models.CharField("카테고리 이름", max_length=100)
    slug = models.SlugField("카테고리 슬러그", unique=True)
    description = models.TextField("설명", blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_visible = models.BooleanField("노출 여부", default=True)
    menu_placement = models.CharField(
        "메뉴 노출 위치",
        max_length=10,
        choices=MENU_PLACEMENT_CHOICES,
        default=MENU_PLACEMENT_USED,
    )
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.name


class MarketplaceItem(models.Model):
    """중고장터 판매글 모델."""

    MENU_PLACEMENT_SALE = "sale"
    MENU_PLACEMENT_USED = "used"
    MENU_PLACEMENT_CHOICES = [
        (MENU_PLACEMENT_SALE, "판매상품"),
        (MENU_PLACEMENT_USED, "중고상품"),
    ]

    SOURCE_MANUAL = "manual"
    SOURCE_IMPORTED = "imported"
    SOURCE_MODE_CHOICES = [
        (SOURCE_MANUAL, "수동 등록"),
        (SOURCE_IMPORTED, "외부 불러오기"),
    ]

    STATUS_ONSALE = "onsale"
    STATUS_RESERVED = "reserved"
    STATUS_SOLD = "sold"
    STATUS_CHOICES = [
        (STATUS_ONSALE, "판매중"),
        (STATUS_RESERVED, "예약중"),
        (STATUS_SOLD, "판매완료"),
    ]

    APPROVAL_PENDING = "pending"
    APPROVAL_APPROVED = "approved"
    APPROVAL_REJECTED = "rejected"
    APPROVAL_STATUS_CHOICES = [
        (APPROVAL_PENDING, "검토중"),
        (APPROVAL_APPROVED, "승인"),
        (APPROVAL_REJECTED, "반려"),
    ]

    title = models.CharField("제목", max_length=200)
    description = models.TextField("설명")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="market_items", on_delete=models.CASCADE)
    category = models.ForeignKey(
        MarketplaceCategory,
        related_name="items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    product_category = models.ForeignKey(
        "catalog.ProductCategory",
        related_name="marketplace_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    image = models.ImageField("대표 이미지", upload_to="marketplace/", blank=True, null=True)
    external_image_url = models.URLField("외부 이미지 URL", blank=True)
    price = models.DecimalField("가격", max_digits=12, decimal_places=2)
    view_count = models.PositiveIntegerField("조회수", default=0)
    region = models.CharField("지역", max_length=100)
    status = models.CharField("거래 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_ONSALE)
    source_mode = models.CharField("등록 방식", max_length=20, choices=SOURCE_MODE_CHOICES, default=SOURCE_MANUAL)
    external_provider = models.ForeignKey(
        "catalog.ExternalProvider",
        related_name="marketplace_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    external_reference = models.CharField("외부 참조값", max_length=255, blank=True)
    external_payload = models.JSONField("외부 원본 메타", default=dict, blank=True)
    option_snapshot = models.JSONField("선택 옵션 스냅샷", default=dict, blank=True)
    is_negotiable = models.BooleanField("가격 흥정 가능", default=False)
    approval_status = models.CharField("승인 상태", max_length=20, choices=APPROVAL_STATUS_CHOICES, default=APPROVAL_PENDING)
    approval_note = models.CharField("승인 메모", max_length=255, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="reviewed_market_items",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField("검토 시각", null=True, blank=True)
    menu_placement = models.CharField(
        "메뉴 노출 위치",
        max_length=10,
        choices=MENU_PLACEMENT_CHOICES,
        default=MENU_PLACEMENT_USED,
    )
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class PurchaseRequest(models.Model):
    """구매 요청 이력 모델."""

    item = models.ForeignKey(MarketplaceItem, related_name="purchase_requests", on_delete=models.CASCADE)
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="purchase_requests", on_delete=models.CASCADE)
    message = models.CharField("구매 요청 메시지", max_length=255, blank=True)
    created_at = models.DateTimeField("요청일", auto_now_add=True)

    class Meta:
        unique_together = ("item", "buyer")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.buyer} -> {self.item}"
