from channels.generic.websocket import AsyncJsonWebsocketConsumer
from urllib.parse import parse_qs


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """회원별 알림 웹소켓 소비자."""

    async def connect(self):
        """MVP 단계에서는 query string의 user_id를 기준으로 그룹에 참가한다."""
        query_string = self.scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        user_id = params.get("user_id", [None])[0]
        if not user_id:
            await self.close(code=4001)
            return

        self.group_name = f"notifications_{user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        """연결 종료 시 그룹에서 빠진다."""
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """클라이언트 ping 요청에 최소 응답만 돌려준다."""
        await self.send_json({"received": content})

    async def notify_message(self, event):
        """저장된 알림 payload를 클라이언트로 푸시한다."""
        await self.send_json(event["payload"])
