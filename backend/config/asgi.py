"""ASGI 진입점."""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from django.urls import path

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

django_asgi_app = get_asgi_application()

from apps.notifications.consumers import NotificationConsumer  # noqa: E402
from apps.live.consumers import LiveChatConsumer  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    path("ws/notifications/", NotificationConsumer.as_asgi()),
                    path("ws/live/<int:room_id>/chat/", LiveChatConsumer.as_asgi()),
                ]
            )
        ),
    }
)
