from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import BannedIP, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """커스텀 회원 모델 관리자."""

    fieldsets = UserAdmin.fieldsets + (
        (
            "커뮤니티 정보",
            {
                "fields": (
                    "nickname",
                    "grade",
                    "operator_role",
                    "points",
                    "profile_image",
                    "is_suspended",
                    "suspend_until",
                    "suspend_reason",
                    "suspend_public",
                    "suspend_count",
                    "created_at",
                )
            },
        ),
    )
    readonly_fields = ("created_at", "suspend_count")
    list_display = ("id", "username", "email", "nickname", "grade", "operator_role", "points", "is_suspended", "is_staff")
    search_fields = ("username", "email", "nickname")


@admin.register(BannedIP)
class BannedIPAdmin(admin.ModelAdmin):
    list_display = ("id", "ip_address", "reason", "expires_at", "created_by", "created_at")
    search_fields = ("ip_address", "reason")
