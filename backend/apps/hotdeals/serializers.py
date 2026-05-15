from django.utils import timezone
from rest_framework import serializers

from .models import Hotdeal, HotdealCategory


class HotdealCategorySerializer(serializers.ModelSerializer):
    """핫딜 카테고리 직렬화기."""

    class Meta:
        model = HotdealCategory
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "sort_order",
            "is_visible",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("slug", "created_at", "updated_at")


class HotdealSerializer(serializers.ModelSerializer):
    """핫딜 목록/상세 응답 직렬화기."""

    author_nickname = serializers.CharField(source="author.nickname", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Hotdeal
        fields = (
            "id",
            "title",
            "description",
            "author",
            "author_nickname",
            "category",
            "category_name",
            "category_slug",
            "source_url",
            "live_url",
            "image",
            "original_price",
            "sale_price",
            "discount_rate",
            "view_count",
            "expires_at",
            "status",
            "is_expired",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("author", "discount_rate", "status", "created_at", "updated_at")

    def get_is_expired(self, obj):
        """만료 시각 기준으로 상태를 노출한다."""
        return obj.status == Hotdeal.STATUS_EXPIRED or obj.expires_at <= timezone.now()


class HotdealExpireSerializer(serializers.ModelSerializer):
    """핫딜 만료 처리 직렬화기."""

    class Meta:
        model = Hotdeal
        fields = ("status",)
        read_only_fields = ("status",)
