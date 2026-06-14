from rest_framework import serializers
import re

from .models import (
    CategoryFilter,
    CategoryFilterOption,
    CategoryReferenceImage,
    HomeProductSectionConfig,
    HomeBoardSectionConfig,
    HomeHeroSlide,
    SiteDisplaySetting,
    CategoryMapping,
    ExternalAttribute,
    ExternalCategory,
    ExternalProvider,
    FilterMapping,
    ProductAlertSubscription,
    ProductCategory,
    SellerOptionPreset,
    SubscriptionChannel,
)


class CategoryFilterOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryFilterOption
        fields = ("id", "filter", "label", "normalized_value", "color_code", "sort_order", "is_active")


class CategoryReferenceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryReferenceImage
        fields = ("id", "category", "title", "image", "source_mode", "description", "sort_order", "is_active")


class HomeProductSectionConfigSerializer(serializers.ModelSerializer):
    board_name = serializers.CharField(source="board.name", read_only=True)
    board_slug = serializers.CharField(source="board.slug", read_only=True)
    board_type = serializers.CharField(source="board.board_type", read_only=True)
    board_product_board_type = serializers.CharField(source="board.product_board_type", read_only=True)

    class Meta:
        model = HomeProductSectionConfig
        fields = (
            "id",
            "title",
            "description",
            "source_type",
            "board",
            "board_name",
            "board_slug",
            "board_type",
            "board_product_board_type",
            "category_keyword",
            "item_limit",
            "sort_order",
            "is_active",
        )

    def validate(self, attrs):
        source_type = attrs.get("source_type", getattr(self.instance, "source_type", None))
        board = attrs.get("board", getattr(self.instance, "board", None))
        if source_type == HomeProductSectionConfig.SOURCE_PRODUCT_BOARD:
            if board is None:
                raise serializers.ValidationError({"board": "상품게시판 소스는 연결할 게시판을 선택해야 합니다."})
            if board.board_type != "product":
                raise serializers.ValidationError({"board": "상품게시판 유형의 게시판만 연결할 수 있습니다."})
        return attrs


class HomeBoardSectionConfigSerializer(serializers.ModelSerializer):
    board_name = serializers.CharField(source="board.name", read_only=True)
    board_slug = serializers.CharField(source="board.slug", read_only=True)
    board_type = serializers.CharField(source="board.board_type", read_only=True)

    class Meta:
        model = HomeBoardSectionConfig
        fields = (
            "id",
            "title",
            "board",
            "board_name",
            "board_slug",
            "board_type",
            "columns",
            "position",
            "content_mode",
            "item_limit",
            "sort_order",
            "is_active",
        )


class SiteDisplaySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteDisplaySetting
        fields = ("show_side_category_menu", "updated_at")
        read_only_fields = ("updated_at",)


class HomeHeroSlideSerializer(serializers.ModelSerializer):
    href = serializers.CharField(allow_blank=True, required=False)
    display_seconds = serializers.IntegerField(min_value=1, max_value=120, required=False)
    transition_style = serializers.ChoiceField(choices=HomeHeroSlide.TRANSITION_CHOICES, required=False)
    image = serializers.ImageField(required=False)

    # 클라우드(GCS)에서 실제 접근 가능한 전체 URL과 저장 경로를 명확히 제공
    # admin( Django / Next admin-panel )에서 경로를 보고 탐색(클릭)할 수 있도록 함
    image_path = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    @staticmethod
    def _normalize_home_hero_href(value: str) -> str:
        href = (value or "").strip()
        if not href:
            return ""

        if href.startswith("/"):
            return href

        if href.startswith(("http://", "https://")):
            return href

        # Allow explicit scheme links such as mailto:, tel:, etc.
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", href):
            return href

        if " " in href:
            raise serializers.ValidationError("연결 URL에는 공백이 들어갈 수 없습니다.")

        if "." in href:
            return f"https://{href}"

        return f"/{href}"

    def validate_href(self, value: str) -> str:
        return self._normalize_home_hero_href(value)

    def get_image(self, obj):
        if obj.image:
            try:
                return obj.image.url  # 클라우드에서는 GCS 전체 공개 URL, 로컬은 /media/...
            except Exception:
                return ""
        return ""

    def get_image_path(self, obj):
        """저장소 내 실제 경로 (GCS object name). admin에서 'hero/xxx.png' 형태로 확인/탐색 가능"""
        if obj.image:
            return obj.image.name
        return ""

    def get_image_url(self, obj):
        """명시적 전체 URL (image와 동일하지만 admin에서 별도 표시용)"""
        if obj.image:
            try:
                return obj.image.url
            except Exception:
                return ""
        return ""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is None and not attrs.get("image"):
            raise serializers.ValidationError({"image": "새 히어로광고는 이미지를 등록해야 합니다."})
        return attrs

    class Meta:
        model = HomeHeroSlide
        fields = (
            "id",
            "title",
            "description",
            "image",
            "image_path",
            "image_url",
            "badge",
            "href",
            "sort_order",
            "display_seconds",
            "transition_style",
            "is_active",
        )


class CategoryFilterSerializer(serializers.ModelSerializer):
    options = CategoryFilterOptionSerializer(many=True, read_only=True)

    class Meta:
        model = CategoryFilter
        fields = (
            "id",
            "category",
            "name",
            "slug",
            "filter_type",
            "source_mode",
            "is_required",
            "is_visible",
            "sort_order",
            "options",
        )
        read_only_fields = ("slug",)


class ProductCategorySerializer(serializers.ModelSerializer):
    filters = CategoryFilterSerializer(many=True, read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    child_categories = serializers.SerializerMethodField()
    reference_images = CategoryReferenceImageSerializer(many=True, read_only=True)

    class Meta:
        model = ProductCategory
        fields = (
            "id",
            "parent",
            "parent_name",
            "name",
            "slug",
            "description",
            "is_active",
            "is_visible",
            "sort_order",
            "filters",
            "child_categories",
            "reference_images",
        )
        read_only_fields = ("slug",)

    def get_child_categories(self, obj):
        return [
            {
                "id": child.id,
                "name": child.name,
                "slug": child.slug,
                "description": child.description,
            }
            for child in obj.children.filter(is_active=True, is_visible=True).order_by("sort_order", "id")
        ]


class ExternalProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalProvider
        fields = (
            "id",
            "name",
            "code",
            "provider_type",
            "base_url",
            "credentials_hint",
            "meta",
            "is_active",
            "last_synced_at",
        )


class ExternalCategorySerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)

    class Meta:
        model = ExternalCategory
        fields = ("id", "provider", "provider_name", "external_id", "name", "full_path", "synced_at")


class ExternalAttributeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    provider_name = serializers.CharField(source="category.provider.name", read_only=True)

    class Meta:
        model = ExternalAttribute
        fields = ("id", "category", "category_name", "provider_name", "external_key", "name", "created_at")


class CategoryMappingSerializer(serializers.ModelSerializer):
    internal_category_name = serializers.CharField(source="internal_category.name", read_only=True)
    external_category_name = serializers.CharField(source="external_category.name", read_only=True)
    provider_name = serializers.CharField(source="external_category.provider.name", read_only=True)

    class Meta:
        model = CategoryMapping
        fields = (
            "id",
            "internal_category",
            "internal_category_name",
            "external_category",
            "external_category_name",
            "provider_name",
            "status",
            "note",
            "approved_by",
            "approved_at",
            "created_at",
        )
        read_only_fields = ("approved_by", "approved_at", "created_at")


class FilterMappingSerializer(serializers.ModelSerializer):
    internal_filter_name = serializers.CharField(source="internal_filter.name", read_only=True)
    external_attribute_name = serializers.CharField(source="external_attribute.name", read_only=True)
    provider_name = serializers.CharField(source="external_attribute.category.provider.name", read_only=True)

    class Meta:
        model = FilterMapping
        fields = (
            "id",
            "internal_filter",
            "internal_filter_name",
            "external_attribute",
            "external_attribute_name",
            "provider_name",
            "status",
            "note",
            "approved_by",
            "approved_at",
            "created_at",
        )
        read_only_fields = ("approved_by", "approved_at", "created_at")


class SubscriptionChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionChannel
        fields = ("id", "channel", "is_enabled", "created_at")
        read_only_fields = ("created_at",)


class ProductAlertSubscriptionSerializer(serializers.ModelSerializer):
    channels = SubscriptionChannelSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = ProductAlertSubscription
        fields = (
            "id",
            "category",
            "category_name",
            "name",
            "filters",
            "keywords",
            "notify_events",
            "is_active",
            "last_matched_at",
            "channels",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("last_matched_at", "created_at", "updated_at")


class ProductAlertSubscriptionWriteSerializer(serializers.ModelSerializer):
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=SubscriptionChannel.CHANNEL_CHOICES),
        allow_empty=False,
        required=False,
    )

    class Meta:
        model = ProductAlertSubscription
        fields = ("category", "name", "filters", "keywords", "notify_events", "is_active", "channels")

    def create(self, validated_data):
        channels = validated_data.pop("channels", [SubscriptionChannel.CHANNEL_IN_APP])
        subscription = ProductAlertSubscription.objects.create(**validated_data)
        for channel in channels:
            SubscriptionChannel.objects.create(subscription=subscription, channel=channel)
        return subscription

    def update(self, instance, validated_data):
        channels = validated_data.pop("channels", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if channels is not None:
            instance.channels.all().delete()
            for channel in channels:
                SubscriptionChannel.objects.create(subscription=instance, channel=channel)
        return instance


class SellerOptionPresetSerializer(serializers.ModelSerializer):
    product_category_name = serializers.CharField(source="product_category.name", read_only=True)

    class Meta:
        model = SellerOptionPreset
        fields = (
            "id",
            "name",
            "product_category",
            "product_category_name",
            "option_snapshot",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")


class SellerImportPreviewRequestSerializer(serializers.Serializer):
    provider = serializers.IntegerField(required=False, allow_null=True)
    product_category = serializers.IntegerField(required=False, allow_null=True)
    external_reference = serializers.CharField(required=False, allow_blank=True)
    raw_payload = serializers.CharField(required=False, allow_blank=True)
