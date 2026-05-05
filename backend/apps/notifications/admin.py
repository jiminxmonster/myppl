from django.contrib import admin

from .models import Notification, NotificationDelivery, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "notification_type", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")
    search_fields = ("title", "message", "user__username", "user__nickname")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "allow_in_app", "allow_email", "allow_kakao", "allow_sms", "updated_at")
    search_fields = ("user__username", "user__nickname", "email", "phone_number")


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    list_display = ("notification", "user", "channel", "status", "provider", "sent_at")
    list_filter = ("channel", "status")
    search_fields = ("user__username", "user__nickname", "target", "dedupe_key")
