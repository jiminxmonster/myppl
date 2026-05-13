from rest_framework import serializers

from .models import MarketplaceCategory, MarketplaceItem, PurchaseRequest


class MarketplaceCategorySerializer(serializers.ModelSerializer):
    """중고장터 카테고리 직렬화기."""

    class Meta:
        model = MarketplaceCategory
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "sort_order",
            "is_visible",
            "menu_placement",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("slug", "created_at", "updated_at")


class MarketplaceItemSerializer(serializers.ModelSerializer):
    """중고장터 목록/상세 응답 직렬화기."""

    original_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    author_nickname = serializers.CharField(source="author.nickname", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    product_category_name = serializers.CharField(source="product_category.name", read_only=True)
    product_category_slug = serializers.CharField(source="product_category.slug", read_only=True)
    external_provider_name = serializers.CharField(source="external_provider.name", read_only=True)
    reviewed_by_nickname = serializers.CharField(source="reviewed_by.nickname", read_only=True)
    purchase_request_count = serializers.SerializerMethodField()

    class Meta:
        model = MarketplaceItem
        fields = (
            "id",
            "title",
            "description",
            "author",
            "author_nickname",
            "category",
            "category_name",
            "category_slug",
            "product_category",
            "product_category_name",
            "product_category_slug",
            "image",
            "external_image_url",
            "original_price",
            "price",
            "view_count",
            "region",
            "status",
            "source_mode",
            "external_provider",
            "external_provider_name",
            "external_reference",
            "external_payload",
            "option_snapshot",
            "is_negotiable",
            "approval_status",
            "approval_note",
            "reviewed_by",
            "reviewed_by_nickname",
            "reviewed_at",
            "menu_placement",
            "purchase_request_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("author", "created_at", "updated_at", "reviewed_by", "reviewed_at")

    def to_internal_value(self, data):
        if hasattr(data, "copy"):
            data = data.copy()
        if data.get("original_price") == "":
            data["original_price"] = None
        return super().to_internal_value(data)

    def get_purchase_request_count(self, obj):
        """판매글에 연결된 구매 요청 수를 계산한다."""
        return obj.purchase_requests.count()


class MarketplaceStatusSerializer(serializers.ModelSerializer):
    """거래 상태 변경 직렬화기."""

    class Meta:
        model = MarketplaceItem
        fields = ("status",)


class MarketplaceApprovalSerializer(serializers.ModelSerializer):
    """운영자 판매글 승인/반려 직렬화기."""

    class Meta:
        model = MarketplaceItem
        fields = ("approval_status", "approval_note")


class PurchaseRequestSerializer(serializers.ModelSerializer):
    """구매 요청 직렬화기."""

    buyer_nickname = serializers.CharField(source="buyer.nickname", read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = ("id", "item", "buyer", "buyer_nickname", "message", "created_at")
        read_only_fields = ("item", "buyer", "created_at")
