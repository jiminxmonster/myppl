from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """알림 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    label = "notifications"
