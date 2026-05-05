from django.conf import settings
from django.db import models


class Notification(models.Model):
    """회원별 실시간 알림 모델."""

    TYPE_COMMENT = "comment"
    TYPE_LIKE = "like"
    TYPE_MESSAGE = "message"
    TYPE_PURCHASE = "purchase"
    TYPE_CHOICES = [
        (TYPE_COMMENT, "댓글"),
        (TYPE_LIKE, "추천"),
        (TYPE_MESSAGE, "쪽지"),
        (TYPE_PURCHASE, "구매요청"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE)
    notification_type = models.CharField("알림 종류", max_length=20, choices=TYPE_CHOICES)
    title = models.CharField("알림 제목", max_length=120)
    message = models.TextField("알림 내용")
    target_url = models.CharField("이동 경로", max_length=255, blank=True)
    is_read = models.BooleanField("읽음 여부", default=False)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["is_read", "-created_at"]

    def __str__(self) -> str:
        return f"{self.user} - {self.title}"


class NotificationPreference(models.Model):
    """사용자별 알림 채널 설정."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="notification_preference", on_delete=models.CASCADE)
    allow_in_app = models.BooleanField("내부 알림 허용", default=True)
    allow_email = models.BooleanField("이메일 허용", default=False)
    allow_kakao = models.BooleanField("카카오 허용", default=False)
    allow_sms = models.BooleanField("문자 허용", default=False)
    email = models.EmailField("수신 이메일", blank=True)
    phone_number = models.CharField("수신 번호", max_length=30, blank=True)
    kakao_target = models.CharField("카카오 식별값", max_length=120, blank=True)
    quiet_hours_start = models.PositiveSmallIntegerField("야간 시작 시", default=23)
    quiet_hours_end = models.PositiveSmallIntegerField("야간 종료 시", default=8)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    def __str__(self) -> str:
        return f"{self.user} 알림 설정"


class NotificationDelivery(models.Model):
    """채널별 알림 발송 이력."""

    CHANNEL_IN_APP = "in_app"
    CHANNEL_EMAIL = "email"
    CHANNEL_KAKAO = "kakao"
    CHANNEL_SMS = "sms"
    CHANNEL_CHOICES = [
        (CHANNEL_IN_APP, "내부 알림"),
        (CHANNEL_EMAIL, "이메일"),
        (CHANNEL_KAKAO, "카카오톡"),
        (CHANNEL_SMS, "문자"),
    ]
    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"
    STATUS_SKIPPED = "skipped"
    STATUS_CHOICES = [
        (STATUS_PENDING, "대기"),
        (STATUS_SENT, "발송완료"),
        (STATUS_FAILED, "실패"),
        (STATUS_SKIPPED, "건너뜀"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notification_deliveries", on_delete=models.CASCADE)
    notification = models.ForeignKey(Notification, related_name="deliveries", on_delete=models.CASCADE)
    channel = models.CharField("발송 채널", max_length=20, choices=CHANNEL_CHOICES)
    status = models.CharField("발송 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    target = models.CharField("발송 대상", max_length=255, blank=True)
    provider = models.CharField("발송 제공자", max_length=120, blank=True)
    response_code = models.CharField("응답 코드", max_length=120, blank=True)
    response_message = models.TextField("응답 메시지", blank=True)
    dedupe_key = models.CharField("중복 방지 키", max_length=255, blank=True, db_index=True)
    sent_at = models.DateTimeField("발송 시각", null=True, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.user} - {self.channel} - {self.status}"
