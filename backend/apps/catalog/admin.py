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
    list_display = ("show_side_category_menu", "updated_at")


@admin.register(HomeHeroSlide)
class HomeHeroSlideAdmin(admin.ModelAdmin):
    list_display = ("title", "href", "sort_order", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "description", "href")
