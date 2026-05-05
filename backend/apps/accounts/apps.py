from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """회원 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    label = "accounts"
