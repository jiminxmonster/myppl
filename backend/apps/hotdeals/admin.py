from django.contrib import admin

from .models import Hotdeal


@admin.register(Hotdeal)
class HotdealAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "status", "sale_price", "live_url", "expires_at", "created_at")
    list_filter = ("status", "category")
    search_fields = ("title", "description", "source_url", "live_url")
