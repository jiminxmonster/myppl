from django.conf import settings
from django.db import models
from django.utils.text import slugify


class ExternalProvider(models.Model):
    """외부 쇼핑몰 또는 제휴 데이터 제공자."""

    TYPE_API = "api"
    TYPE_FEED = "feed"
    TYPE_CRAWL = "crawl"
    TYPE_CHOICES = [
        (TYPE_API, "공식 API"),
        (TYPE_FEED, "데이터 피드"),
        (TYPE_CRAWL, "크롤링"),
    ]

    name = models.CharField("제공자명", max_length=100)
    code = models.SlugField("제공자 코드", unique=True)
    provider_type = models.CharField("연동 방식", max_length=20, choices=TYPE_CHOICES, default=TYPE_API)
    base_url = models.URLField("기본 URL", blank=True)
    credentials_hint = models.CharField("키 관리 메모", max_length=255, blank=True)
    meta = models.JSONField("연동 메타", default=dict, blank=True)
    is_active = models.BooleanField("활성 여부", default=True)
    last_synced_at = models.DateTimeField("마지막 동기화 시각", null=True, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self) -> str:
        return self.name


class ProductCategory(models.Model):
    """사용자에게 노출되는 내부 표준 상품 카테고리."""

    parent = models.ForeignKey("self", related_name="children", null=True, blank=True, on_delete=models.CASCADE)
    name = models.CharField("카테고리명", max_length=120)
    slug = models.SlugField("카테고리 슬러그", unique=True, blank=True)
    description = models.TextField("설명", blank=True)
    is_active = models.BooleanField("활성 여부", default=True)
    is_visible = models.BooleanField("노출 여부", default=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="created_product_categories", on_delete=models.SET_NULL)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]
        verbose_name = "내부 상품 카테고리"
        verbose_name_plural = "내부 상품 카테고리"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class CategoryFilter(models.Model):
    """카테고리별 사용자 선택 필터 정의."""

    TYPE_CHECKBOX = "checkbox"
    TYPE_SINGLE = "single"
    TYPE_RANGE = "range"
    TYPE_TEXT = "text"
    FILTER_TYPE_CHOICES = [
        (TYPE_CHECKBOX, "다중 체크"),
        (TYPE_SINGLE, "단일 선택"),
        (TYPE_RANGE, "범위형"),
        (TYPE_TEXT, "텍스트"),
    ]
    SOURCE_MANUAL = "manual"
    SOURCE_IMPORTED = "imported"
    SOURCE_HYBRID = "hybrid"
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, "수동"),
        (SOURCE_IMPORTED, "자동수집"),
        (SOURCE_HYBRID, "혼합"),
    ]

    category = models.ForeignKey(ProductCategory, related_name="filters", on_delete=models.CASCADE)
    name = models.CharField("필터명", max_length=120)
    slug = models.SlugField("필터 슬러그", blank=True)
    filter_type = models.CharField("필터 타입", max_length=20, choices=FILTER_TYPE_CHOICES, default=TYPE_CHECKBOX)
    source_mode = models.CharField("생성 방식", max_length=20, choices=SOURCE_CHOICES, default=SOURCE_HYBRID)
    is_required = models.BooleanField("필수 여부", default=False)
    is_visible = models.BooleanField("노출 여부", default=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]
        unique_together = ("category", "slug")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.category.name} - {self.name}"


class CategoryFilterOption(models.Model):
    """체크형 필터의 선택 옵션."""

    filter = models.ForeignKey(CategoryFilter, related_name="options", on_delete=models.CASCADE)
    label = models.CharField("표시명", max_length=120)
    normalized_value = models.CharField("정규화 값", max_length=120, blank=True)
    color_code = models.CharField("색상 코드", max_length=20, blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_active = models.BooleanField("활성 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.label


class CategoryReferenceImage(models.Model):
    """카테고리 하단에 노출할 참고 이미지/상품 카드."""

    SOURCE_MANUAL = "manual"
    SOURCE_IMPORTED = "imported"
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, "수동"),
        (SOURCE_IMPORTED, "자동수집"),
    ]

    category = models.ForeignKey(ProductCategory, related_name="reference_images", on_delete=models.CASCADE)
    title = models.CharField("표시명", max_length=120)
    image = models.ImageField("이미지", upload_to="catalog/reference-images/")
    source_mode = models.CharField("생성 방식", max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    description = models.CharField("설명", max_length=255, blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_active = models.BooleanField("활성 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return f"{self.category.name} - {self.title}"


class HomeProductSectionConfig(models.Model):
    """메인 화면의 카테고리별 상품 슬라이드 섹션 설정."""

    SOURCE_RECENT_SEARCH = "recent_search"
    SOURCE_HOTDEAL = "hotdeal"
    SOURCE_MARKETPLACE = "marketplace"
    SOURCE_PRODUCT_BOARD = "product_board"
    SOURCE_CHOICES = [
        (SOURCE_RECENT_SEARCH, "최근검색상품"),
        (SOURCE_HOTDEAL, "핫딜"),
        (SOURCE_MARKETPLACE, "중고장터"),
        (SOURCE_PRODUCT_BOARD, "상품게시판"),
    ]

    title = models.CharField("섹션 제목", max_length=120)
    description = models.CharField("섹션 설명", max_length=255, blank=True)
    source_type = models.CharField("데이터 소스", max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MARKETPLACE)
    board = models.ForeignKey(
        "boards.Board",
        verbose_name="연결 상품게시판",
        related_name="home_product_sections",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    category_keyword = models.CharField("카테고리 키워드", max_length=120, blank=True)
    item_limit = models.PositiveIntegerField("노출 개수", default=8)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_active = models.BooleanField("활성 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.title


class SiteDisplaySetting(models.Model):
    """사이트 화면 노출 설정."""

    show_side_category_menu = models.BooleanField("좌측 녹색 카테고리 메뉴 노출", default=False)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "사이트 화면 설정"
        verbose_name_plural = "사이트 화면 설정"

    def __str__(self) -> str:
        return "사이트 화면 설정"

    @classmethod
    def get_solo(cls):
        setting, _ = cls.objects.get_or_create(id=1, defaults={"show_side_category_menu": False})
        return setting


class HomeHeroSlide(models.Model):
    """메인 페이지 전면 광고 슬라이더 설정."""

    TRANSITION_NEXT = "next"
    TRANSITION_SLIDE_HORIZONTAL = "slide_lr"
    TRANSITION_SLIDE_VERTICAL = "slide_ud"
    TRANSITION_FADE = "fade"
    TRANSITION_MOSAIC = "mosaic"
    TRANSITION_ZOOM = "zoom"
    TRANSITION_ROTATE = "rotate"
    TRANSITION_FLIP = "flip"
    TRANSITION_WIPE = "wipe"
    TRANSITION_CINEMA = "cinema"
    TRANSITION_CHOICES = [
        (TRANSITION_NEXT, "깔끔 다음 페이지"),
        (TRANSITION_SLIDE_HORIZONTAL, "슬라이드 좌우"),
        (TRANSITION_SLIDE_VERTICAL, "슬라이드 상하"),
        (TRANSITION_FADE, "페이드아웃 페이드인"),
        (TRANSITION_MOSAIC, "모자이크식 슬라이드전환"),
        (TRANSITION_ZOOM, "줌 인"),
        (TRANSITION_ROTATE, "회전"),
        (TRANSITION_FLIP, "플립"),
        (TRANSITION_WIPE, "와이프"),
        (TRANSITION_CINEMA, "시네마 슬라이드"),
    ]

    title = models.CharField("슬라이드 제목", max_length=120)
    description = models.CharField("슬라이드 설명", max_length=255, blank=True)
    image = models.ImageField(
        "슬라이드 이미지",
        upload_to="hero/",
        help_text="클라우드(GCS)에서는 'hero/파일명' 경로로 저장됩니다. Admin에서 이미지 업로드 후 '경로' 링크를 클릭해 실제 파일 위치를 탐색할 수 있습니다.",
    )
    badge = models.CharField("배지", max_length=40, blank=True)
    href = models.URLField("연결 URL", blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    display_seconds = models.PositiveIntegerField("표시 시간(초)", default=3)
    transition_style = models.CharField(
        "전환 방식",
        max_length=20,
        choices=TRANSITION_CHOICES,
        default=TRANSITION_NEXT,
    )
    is_active = models.BooleanField("활성 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.title


class ExternalCategory(models.Model):
    """외부 제공자에서 수집한 원본 카테고리."""

    provider = models.ForeignKey(ExternalProvider, related_name="categories", on_delete=models.CASCADE)
    external_id = models.CharField("외부 카테고리 ID", max_length=120)
    name = models.CharField("외부 카테고리명", max_length=255)
    full_path = models.CharField("경로", max_length=500, blank=True)
    raw_payload = models.JSONField("원본 payload", default=dict, blank=True)
    synced_at = models.DateTimeField("수집 시각", auto_now=True)

    class Meta:
        ordering = ["provider__name", "name", "id"]
        unique_together = ("provider", "external_id")

    def __str__(self) -> str:
        return f"{self.provider.name} - {self.name}"


class ExternalAttribute(models.Model):
    """외부 카테고리에서 수집한 원본 속성."""

    category = models.ForeignKey(ExternalCategory, related_name="attributes", on_delete=models.CASCADE)
    external_key = models.CharField("외부 속성 키", max_length=120)
    name = models.CharField("외부 속성명", max_length=255)
    raw_payload = models.JSONField("원본 payload", default=dict, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        unique_together = ("category", "external_key")

    def __str__(self) -> str:
        return f"{self.category.name} - {self.name}"


class ExternalAttributeValue(models.Model):
    """외부 속성의 원본 값 후보."""

    attribute = models.ForeignKey(ExternalAttribute, related_name="values", on_delete=models.CASCADE)
    external_value = models.CharField("외부 값", max_length=255)
    normalized_value = models.CharField("정규화 값", max_length=255, blank=True)
    raw_payload = models.JSONField("원본 payload", default=dict, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["external_value", "id"]
        unique_together = ("attribute", "external_value")

    def __str__(self) -> str:
        return self.external_value


class CategoryMapping(models.Model):
    """외부 카테고리를 내부 카테고리에 연결하는 승인 매핑."""

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "대기"),
        (STATUS_APPROVED, "승인"),
        (STATUS_REJECTED, "기각"),
    ]

    internal_category = models.ForeignKey(ProductCategory, related_name="external_mappings", on_delete=models.CASCADE)
    external_category = models.ForeignKey(ExternalCategory, related_name="internal_mappings", on_delete=models.CASCADE)
    status = models.CharField("승인 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    note = models.CharField("운영 메모", max_length=255, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="approved_category_mappings", on_delete=models.SET_NULL)
    approved_at = models.DateTimeField("승인 시각", null=True, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        unique_together = ("internal_category", "external_category")


class FilterMapping(models.Model):
    """외부 속성을 내부 필터에 연결하는 승인 매핑."""

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "대기"),
        (STATUS_APPROVED, "승인"),
        (STATUS_REJECTED, "기각"),
    ]

    internal_filter = models.ForeignKey(CategoryFilter, related_name="external_mappings", on_delete=models.CASCADE)
    external_attribute = models.ForeignKey(ExternalAttribute, related_name="internal_mappings", on_delete=models.CASCADE)
    status = models.CharField("승인 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    note = models.CharField("운영 메모", max_length=255, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="approved_filter_mappings", on_delete=models.SET_NULL)
    approved_at = models.DateTimeField("승인 시각", null=True, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        unique_together = ("internal_filter", "external_attribute")


class ProductAlertSubscription(models.Model):
    """사용자가 저장한 관심 상품 조건."""

    EVENT_NEW_PRODUCT = "new_product"
    EVENT_PRICE_DROP = "price_drop"
    EVENT_RESTOCK = "restock"
    EVENT_CHOICES = [
        (EVENT_NEW_PRODUCT, "신규 상품"),
        (EVENT_PRICE_DROP, "가격 하락"),
        (EVENT_RESTOCK, "재입고"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="product_alert_subscriptions", on_delete=models.CASCADE)
    category = models.ForeignKey(ProductCategory, related_name="alert_subscriptions", on_delete=models.CASCADE)
    name = models.CharField("알림 이름", max_length=120)
    filters = models.JSONField("저장된 필터 조건", default=dict, blank=True)
    keywords = models.JSONField("추가 키워드", default=list, blank=True)
    notify_events = models.JSONField("알림 이벤트", default=list, blank=True)
    is_active = models.BooleanField("활성 여부", default=True)
    last_matched_at = models.DateTimeField("마지막 매칭 시각", null=True, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.user} - {self.name}"


class SubscriptionChannel(models.Model):
    """관심조건별 알림 채널 선택."""

    CHANNEL_IN_APP = "in_app"
    CHANNEL_EMAIL = "email"
    CHANNEL_KAKAO = "kakao"
    CHANNEL_SMS = "sms"
    CHANNEL_CHOICES = [
        (CHANNEL_IN_APP, "내부 알림"),
        (CHANNEL_EMAIL, "이메일"),
        (CHANNEL_KAKAO, "카카오톡"),
        (CHANNEL_SMS, "문자"),
    ]

    subscription = models.ForeignKey(ProductAlertSubscription, related_name="channels", on_delete=models.CASCADE)
    channel = models.CharField("알림 채널", max_length=20, choices=CHANNEL_CHOICES)
    is_enabled = models.BooleanField("활성 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["id"]
        unique_together = ("subscription", "channel")

    def __str__(self) -> str:
        return f"{self.subscription_id} - {self.channel}"


class SellerOptionPreset(models.Model):
    """판매자가 반복 사용하는 상세 옵션 세트."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="seller_option_presets", on_delete=models.CASCADE)
    name = models.CharField("프리셋 이름", max_length=120)
    product_category = models.ForeignKey(
        ProductCategory,
        related_name="seller_option_presets",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    option_snapshot = models.JSONField("옵션 스냅샷", default=dict, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["name", "-updated_at", "-id"]
        unique_together = ("user", "name")

    def __str__(self) -> str:
        return f"{self.user} - {self.name}"
