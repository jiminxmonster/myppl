from rest_framework import serializers
import re

from .models import (
    CategoryFilter,
    CategoryFilterOption,
    CategoryReferenceImage,
    HomeProductSectionConfig,
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
    class Meta:
        model = HomeProductSectionConfig
        fields = (
            "id",
            "title",
            "description",
            "source_type",
            "category_keyword",
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

    class Meta:
        model = HomeHeroSlide
        fields = (
            "id",
            "title",
            "description",
            "image",
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
