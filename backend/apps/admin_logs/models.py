from django.conf import settings
from django.db import models


class AdminLog(models.Model):
    """운영자 행위 추적 로그."""

    ACTION_BOARD_CREATE = "BOARD_CREATE"
    ACTION_BOARD_DELETE = "BOARD_DELETE"
    ACTION_BOARD_HIDE = "BOARD_HIDE"
    ACTION_BOARD_UPDATE = "BOARD_UPDATE"
    ACTION_POST_DELETE = "POST_DELETE"
    ACTION_POST_BLIND = "POST_BLIND"
    ACTION_POST_MOVE = "POST_MOVE"
    ACTION_USER_SUSPEND = "USER_SUSPEND"
    ACTION_USER_UNSUSPEND = "USER_UNSUSPEND"
    ACTION_USER_GRADE = "USER_GRADE"
    ACTION_USER_POINT = "USER_POINT"
    ACTION_IP_BAN = "IP_BAN"
    ACTION_KEYWORD = "KEYWORD_FILTER"
    ACTION_REPORT_HANDLE = "REPORT_HANDLE"
    ACTION_CHOICES = [
        (ACTION_BOARD_CREATE, "게시판 생성"),
        (ACTION_BOARD_DELETE, "게시판 삭제"),
        (ACTION_BOARD_HIDE, "게시판 숨김"),
        (ACTION_BOARD_UPDATE, "게시판 수정"),
        (ACTION_POST_DELETE, "게시글 삭제"),
        (ACTION_POST_BLIND, "게시글 블라인드"),
        (ACTION_POST_MOVE, "게시글 이동"),
        (ACTION_USER_SUSPEND, "회원 정지"),
        (ACTION_USER_UNSUSPEND, "회원 정지해제"),
        (ACTION_USER_GRADE, "등급 변경"),
        (ACTION_USER_POINT, "포인트 조정"),
        (ACTION_IP_BAN, "IP 차단"),
        (ACTION_KEYWORD, "금칙어 관리"),
        (ACTION_REPORT_HANDLE, "신고 처리"),
    ]

    admin = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="admin_logs", on_delete=models.CASCADE)
    action = models.CharField("행동 유형", max_length=30, choices=ACTION_CHOICES)
    target_id = models.PositiveIntegerField("대상 ID")
    detail = models.JSONField("상세 정보", default=dict, blank=True)
    ip_address = models.GenericIPAddressField("처리 IP", null=True, blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.admin_id} - {self.action}"
