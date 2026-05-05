from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    """결제 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    label = "payments"
