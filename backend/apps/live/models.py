from django.conf import settings
from django.db import models
from django.utils import timezone


class LiveRoom(models.Model):
    """방송 방 (Live Room)"""

    STATUS_SCHEDULED = "scheduled"
    STATUS_LIVE = "live"
    STATUS_ENDED = "ended"
    STATUS_HIDDEN = "hidden"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "예정"),
        (STATUS_LIVE, "라이브"),
        (STATUS_ENDED, "종료"),
        (STATUS_HIDDEN, "숨김"),
    ]

    title = models.CharField("방송 제목", max_length=200)
    description = models.TextField("방송 설명", blank=True)
    live_url = models.URLField("외부 라이브 URL", max_length=500, blank=True)
    embed_url = models.URLField("임베드 URL", max_length=500, blank=True)
    thumbnail = models.ImageField("썸네일", upload_to="live/thumbnails/", null=True, blank=True)

    status = models.CharField("방송 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    starts_at = models.DateTimeField("시작 예정 시간", null=True, blank=True)
    started_at = models.DateTimeField("실제 시작 시간", null=True, blank=True)
    ended_at = models.DateTimeField("종료 시간", null=True, blank=True)

    chat_enabled = models.BooleanField("채팅 사용", default=True)
    guest_view_allowed = models.BooleanField("비로그인 시청 허용", default=True)
    is_visible = models.BooleanField("목록 노출", default=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_live_rooms",
        null=True,
        blank=True,
        verbose_name="방송 주인(판매자)",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_live_rooms"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="updated_live_rooms"
    )

    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        verbose_name = "라이브 방송"
        verbose_name_plural = "라이브 방송"
        ordering = ["-sort_order", "-starts_at", "-created_at"]

    def __str__(self):
        return self.title

    def get_effective_embed_url(self):
        """embed_url 우선, 안전한 도메인만 iframe 허용. YouTube 자동 변환 지원."""
        url = self.embed_url or self.live_url or ""
        if not url:
            return ""
        allowed = ["youtube.com", "youtu.be", "vimeo.com"]
        try:
            from urllib.parse import urlparse
            p = urlparse(url)
            if any(d in p.netloc for d in allowed):
                if self.embed_url:
                    return self.embed_url
                if "youtube" in p.netloc or "youtu.be" in p.netloc:
                    import re
                    m = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
                    if m:
                        return f"https://www.youtube.com/embed/{m.group(1)}?autoplay=1"
                return url
            return ""  # 안전하지 않은 도메인
        except:
            return ""


class LiveRoomProduct(models.Model):
    """방송에 연결된 상품 (기존 Post 재사용)"""

    live_room = models.ForeignKey(LiveRoom, on_delete=models.CASCADE, related_name="products")
    post = models.ForeignKey("boards.Post", on_delete=models.CASCADE, related_name="live_room_products")

    title = models.CharField("표시 상품명", max_length=200, blank=True)
    price = models.CharField("표시 가격", max_length=50, blank=True)
    image = models.CharField("표시 이미지 URL", max_length=500, blank=True)
    external_url = models.URLField("외부 구매 링크", max_length=500, blank=True)

    is_featured = models.BooleanField("현재 소개중", default=False)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "방송 연결 상품"
        verbose_name_plural = "방송 연결 상품"
        ordering = ["sort_order", "-created_at"]

    def __str__(self):
        return self.title or (self.post.title if self.post_id else "상품")


class LiveChatMessage(models.Model):
    """방송 채팅 메시지"""

    live_room = models.ForeignKey(LiveRoom, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    message = models.TextField("메시지")
    is_hidden = models.BooleanField("숨김", default=False)
    hidden_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="hidden_chat_messages"
    )
    hidden_reason = models.CharField("숨김 사유", max_length=200, blank=True)

    created_at = models.DateTimeField("작성일", auto_now_add=True)

    class Meta:
        verbose_name = "라이브 채팅 메시지"
        verbose_name_plural = "라이브 채팅 메시지"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.live_room_id}] {self.user}: {self.message[:30]}"
