from django.contrib import admin

from .models import (
    CategoryFilter,
    CategoryFilterOption,
    HomeProductSectionConfig,
    HomeHeroSlide,
    SiteDisplaySetting,
    CategoryMapping,
    ExternalAttribute,
    ExternalAttributeValue,
    ExternalCategory,
    ExternalProvider,
    FilterMapping,
    ProductAlertSubscription,
    ProductCategory,
    SellerOptionPreset,
    SubscriptionChannel,
)


@admin.register(ExternalProvider)
class ExternalProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "provider_type", "is_active", "last_synced_at")
    search_fields = ("name", "code")
    list_filter = ("provider_type", "is_active")


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "sort_order", "is_active", "is_visible")
    search_fields = ("name", "slug")
    list_filter = ("is_active", "is_visible")


@admin.register(CategoryFilter)
class CategoryFilterAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "filter_type", "source_mode", "is_visible", "sort_order")
    search_fields = ("name", "slug")
    list_filter = ("filter_type", "source_mode", "is_visible")


@admin.register(CategoryFilterOption)
class CategoryFilterOptionAdmin(admin.ModelAdmin):
    list_display = ("label", "filter", "normalized_value", "sort_order", "is_active")
    search_fields = ("label", "normalized_value")
    list_filter = ("is_active",)


@admin.register(ExternalCategory)
class ExternalCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "provider", "external_id", "synced_at")
    search_fields = ("name", "external_id", "full_path")


@admin.register(ExternalAttribute)
class ExternalAttributeAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "external_key", "created_at")
    search_fields = ("name", "external_key")


@admin.register(ExternalAttributeValue)
class ExternalAttributeValueAdmin(admin.ModelAdmin):
    list_display = ("external_value", "attribute", "normalized_value")
    search_fields = ("external_value", "normalized_value")


@admin.register(CategoryMapping)
class CategoryMappingAdmin(admin.ModelAdmin):
    list_display = ("internal_category", "external_category", "status", "approved_by", "approved_at")
    list_filter = ("status",)


@admin.register(FilterMapping)
class FilterMappingAdmin(admin.ModelAdmin):
    list_display = ("internal_filter", "external_attribute", "status", "approved_by", "approved_at")
    list_filter = ("status",)


@admin.register(ProductAlertSubscription)
class ProductAlertSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "category", "is_active", "last_matched_at", "created_at")
    search_fields = ("name", "user__username", "user__nickname")
    list_filter = ("is_active", "category")


@admin.register(SubscriptionChannel)
class SubscriptionChannelAdmin(admin.ModelAdmin):
    list_display = ("subscription", "channel", "is_enabled", "created_at")
    list_filter = ("channel", "is_enabled")


@admin.register(SellerOptionPreset)
class SellerOptionPresetAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "product_category", "updated_at")
    search_fields = ("name", "user__username", "user__nickname")
    list_filter = ("product_category",)


@admin.register(HomeProductSectionConfig)
class HomeProductSectionConfigAdmin(admin.ModelAdmin):
    list_display = ("title", "source_type", "board", "category_keyword", "item_limit", "sort_order", "is_active")
    list_filter = ("source_type", "is_active")
    search_fields = ("title", "category_keyword", "board__name")


@admin.register(SiteDisplaySetting)
class SiteDisplaySettingAdmin(admin.ModelAdmin):
    list_display = ("show_side_category_menu", "show_live_menu", "updated_at")


@admin.register(HomeHeroSlide)
class HomeHeroSlideAdmin(admin.ModelAdmin):
    list_display = ("title", "image_preview", "href", "sort_order", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "description", "href")
    readonly_fields = ("image_preview", "image_path", "image_url")

    def image_preview(self, obj):
        if not obj.image:
            return "-"
        try:
            url = obj.image.url
            path = obj.image.name
            return format_html(
                '<a href="{}" target="_blank" title="클릭하여 실제 이미지 경로 탐색">'
                '<img src="{}" style="max-height: 60px; max-width: 140px; border: 1px solid #ddd; border-radius: 4px; vertical-align: middle;" />'
                '<br/><small>경로: <code>{}</code> (새 탭에서 열기)</small>'
                '</a>',
                url,
                url,
                path,
            )
        except Exception:
            return obj.image.name or "-"

    image_preview.short_description = "이미지 (경로/미리보기)"

    def image_path(self, obj):
        if not obj.image:
            return "-"
        return obj.image.name

    image_path.short_description = "저장 경로 (GCS object name)"

    def image_url(self, obj):
        if not obj.image:
            return "-"
        try:
            url = obj.image.url
            return format_html('<a href="{}" target="_blank">{}</a>', url, url)
        except Exception:
            return "-"

    image_url.short_description = "전체 공개 URL (클릭하여 탐색)"

    def get_readonly_fields(self, request, obj=None):
        # 이미지 필드는 업로드용, 미리보기/경로/URL은 읽기 전용으로 별도 표시
        return super().get_readonly_fields(request, obj) + ("image_preview", "image_path", "image_url")
