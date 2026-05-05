from django.contrib import admin

from .models import AdminLog


@admin.register(AdminLog)
class AdminLogAdmin(admin.ModelAdmin):
    list_display = ("id", "admin", "action", "target_id", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("admin__username", "admin__nickname")
