from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models


class HotdealCategory(models.Model):
    """핫딜 좌측 메뉴와 등록 분류에 쓰는 카테고리."""

    name = models.CharField("카테고리 이름", max_length=100)
    slug = models.SlugField("카테고리 슬러그", unique=True)
    description = models.TextField("설명", blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_visible = models.BooleanField("노출 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.name


class Hotdeal(models.Model):
    """핫딜 게시글 모델."""

    STATUS_ACTIVE = "active"
    STATUS_EXPIRED = "expired"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "진행중"),
        (STATUS_EXPIRED, "만료"),
    ]

    title = models.CharField("제목", max_length=200)
    description = models.TextField("설명")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="hotdeals", on_delete=models.CASCADE)
    category = models.ForeignKey(
        HotdealCategory,
        related_name="hotdeals",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    source_url = models.URLField("구매 링크")
    image = models.ImageField("대표 이미지", upload_to="hotdeals/", blank=True, null=True)
    original_price = models.DecimalField("정가", max_digits=12, decimal_places=2)
    sale_price = models.DecimalField("판매가", max_digits=12, decimal_places=2)
    discount_rate = models.DecimalField("할인율", max_digits=5, decimal_places=2, default=Decimal("0.00"))
    view_count = models.PositiveIntegerField("조회수", default=0)
    expires_at = models.DateTimeField("만료 시각")
    status = models.CharField("상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["status", "-created_at"]

    def save(self, *args, **kwargs):
        """정가와 판매가를 기준으로 할인율을 자동 계산한다."""
        if self.original_price and self.original_price > 0:
            discount = (Decimal("1") - (self.sale_price / self.original_price)) * Decimal("100")
            self.discount_rate = discount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            self.discount_rate = Decimal("0.00")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title
