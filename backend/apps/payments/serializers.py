from decimal import Decimal
from uuid import uuid4

from rest_framework import serializers

from apps.marketplace.models import MarketplaceItem

from .models import Payment


class PaymentPrepareSerializer(serializers.Serializer):
    """결제 준비 요청 직렬화기."""

    marketplace_item_id = serializers.IntegerField(required=False)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    buyer_name = serializers.CharField(max_length=100)
    buyer_email = serializers.EmailField()

    def validate(self, attrs):
        """장터 상품 결제면 상품 금액을 기준으로 금액을 고정한다."""
        item_id = attrs.get("marketplace_item_id")
        if item_id:
            item = serializers.ValidationError
            try:
                marketplace_item = MarketplaceItem.objects.get(id=item_id)
            except MarketplaceItem.DoesNotExist as exc:
                raise serializers.ValidationError({"marketplace_item_id": "존재하지 않는 상품입니다."}) from exc
            attrs["marketplace_item"] = marketplace_item
            attrs["amount"] = marketplace_item.price
        elif attrs.get("amount") is None:
            raise serializers.ValidationError({"amount": "일반 결제는 amount 값이 필요합니다."})

        if Decimal(attrs["amount"]) <= Decimal("0"):
            raise serializers.ValidationError({"amount": "결제 금액은 0보다 커야 합니다."})
        return attrs

    def create(self, validated_data):
        """결제 준비용 주문 레코드를 생성한다."""
        request = self.context["request"]
        marketplace_item = validated_data.get("marketplace_item")
        merchant_uid = f"order_{uuid4().hex[:20]}"
        payment = Payment.objects.create(
            buyer=request.user,
            marketplace_item=marketplace_item,
            merchant_uid=merchant_uid,
            amount=validated_data["amount"],
            metadata={
                "buyer_name": validated_data["buyer_name"],
                "buyer_email": validated_data["buyer_email"],
            },
        )
        return payment


class PaymentSerializer(serializers.ModelSerializer):
    """결제 응답 직렬화기."""

    class Meta:
        model = Payment
        fields = (
            "id",
            "marketplace_item",
            "merchant_uid",
            "amount",
            "currency",
            "provider",
            "payment_key",
            "status",
            "metadata",
            "created_at",
            "updated_at",
        )


class PaymentVerifySerializer(serializers.Serializer):
    """결제 완료 검증 요청 직렬화기."""

    merchant_uid = serializers.CharField(max_length=120)
    payment_key = serializers.CharField(max_length=120)
    status = serializers.ChoiceField(choices=Payment.STATUS_CHOICES)
