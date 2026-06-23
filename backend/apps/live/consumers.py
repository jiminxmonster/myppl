import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import LiveRoom, LiveChatMessage


class LiveChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"live_chat_{self.room_id}"

        # JWT query token support for WS
        user = self.scope.get("user")
        query_string = self.scope.get("query_string", b"").decode()
        if (user is None or isinstance(user, AnonymousUser)) and "token=" in query_string:
            # try to auth from token
            from urllib.parse import parse_qs
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            try:
                params = parse_qs(query_string)
                token_str = params.get("token", [None])[0]
                if token_str:
                    token = AccessToken(token_str)
                    User = get_user_model()
                    user = await database_sync_to_async(User.objects.get)(id=token["user_id"])
                    self.scope["user"] = user
            except Exception:
                pass

        user = self.scope.get("user")
        if user is None or isinstance(user, AnonymousUser):
            # 비로그인 거부 (spec: 기본적으로 채팅 불가, 설정에 따름)
            await self.close()
            return

        # 방 존재 확인
        room = await self.get_room()
        if not room or not room.chat_enabled:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # 최근 메시지 몇개 보내기
        recent = await self.get_recent_messages(20)
        await self.send_json({"type": "recent", "messages": recent})

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content):
        message = content.get("message", "").strip()
        if not message:
            return

        user = self.scope["user"]
        if not user or user.is_anonymous:
            return

        # 금칙어 간단 체크 (기존 로직 재사용 가능하면 좋음, 여기서는 간단)
        # TODO: 재사용 금칙어 필터

        msg = await self.save_message(user, message)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": {
                    "id": msg.id,
                    "user_id": user.id,
                    "nickname": getattr(user, "nickname", user.username),
                    "message": msg.message,
                    "created_at": msg.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        await self.send_json({"type": "message", "message": event["message"]})

    @database_sync_to_async
    def get_room(self):
        try:
            return LiveRoom.objects.get(id=self.room_id, is_visible=True)
        except LiveRoom.DoesNotExist:
            return None

    @database_sync_to_async
    def save_message(self, user, message):
        return LiveChatMessage.objects.create(
            live_room_id=self.room_id, user=user, message=message
        )

    @database_sync_to_async
    def get_recent_messages(self, limit=20):
        qs = LiveChatMessage.objects.filter(live_room_id=self.room_id, is_hidden=False).order_by("-created_at")[:limit]
        return [
            {
                "id": m.id,
                "user_id": m.user_id,
                "nickname": getattr(m.user, "nickname", "") if m.user else "익명",
                "message": m.message,
                "created_at": m.created_at.isoformat(),
            }
            for m in reversed(list(qs))
        ]
