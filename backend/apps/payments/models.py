from django.conf import settings
from django.db import models

from apps.marketplace.models import MarketplaceItem


class Payment(models.Model):
    """포트원 결제 추적용 주문 모델."""

    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "결제대기"),
        (STATUS_PAID, "결제완료"),
        (STATUS_FAILED, "결제실패"),
        (STATUS_CANCELLED, "결제취소"),
    ]

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="payments", on_delete=models.CASCADE)
    marketplace_item = models.ForeignKey(
        MarketplaceItem,
        related_name="payments",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    merchant_uid = models.CharField("주문번호", max_length=120, unique=True)
    amount = models.DecimalField("결제 금액", max_digits=12, decimal_places=2)
    currency = models.CharField("통화", max_length=10, default="KRW")
    provider = models.CharField("PG사", max_length=50, default="portone")
    payment_key = models.CharField("결제 키", max_length=120, blank=True)
    status = models.CharField("결제 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    metadata = models.JSONField("추가 메타데이터", default=dict, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.merchant_uid
