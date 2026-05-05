from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    """중고장터 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.marketplace"
    label = "marketplace"
