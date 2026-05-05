from django.apps import AppConfig


class BoardsConfig(AppConfig):
    """게시판 앱 설정."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.boards"
    label = "boards"
