from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """커뮤니티 회원 모델."""

    GRADE_SEED = "seed"
    GRADE_MEMBER = "member"
    GRADE_BEST = "best"
    GRADE_PREMIUM = "premium"
    GRADE_ADMIN = "admin"
    GRADE_CHOICES = [
        (GRADE_SEED, "새싹"),
        (GRADE_MEMBER, "회원"),
        (GRADE_BEST, "우수회원"),
        (GRADE_PREMIUM, "최우수회원"),
        (GRADE_ADMIN, "운영자"),
    ]
    OPERATOR_NONE = "none"
    OPERATOR_MODERATOR = "moderator"
    OPERATOR_ADMIN = "admin"
    OPERATOR_SUPERADMIN = "superadmin"
    OPERATOR_ROLE_CHOICES = [
        (OPERATOR_NONE, "일반회원"),
        (OPERATOR_MODERATOR, "운영자"),
        (OPERATOR_ADMIN, "관리자"),
        (OPERATOR_SUPERADMIN, "최고관리자"),
    ]
    MEMBER_BUYER = "buyer"
    MEMBER_SELLER = "seller"
    MEMBER_TYPE_CHOICES = [
        (MEMBER_BUYER, "구매자"),
        (MEMBER_SELLER, "판매자"),
    ]

    nickname = models.CharField("닉네임", max_length=30, unique=True)
    member_type = models.CharField("회원 타입", max_length=20, choices=MEMBER_TYPE_CHOICES, default=MEMBER_BUYER)
    grade = models.CharField("회원 등급", max_length=20, choices=GRADE_CHOICES, default=GRADE_SEED)
    operator_role = models.CharField("운영 권한", max_length=20, choices=OPERATOR_ROLE_CHOICES, default=OPERATOR_NONE)
    points = models.IntegerField("포인트", default=0)
    profile_image = models.ImageField("프로필 이미지", upload_to="profiles/", blank=True, null=True)
    is_suspended = models.BooleanField("정지 여부", default=False)
    suspend_until = models.DateTimeField("정지 해제일", null=True, blank=True)
    suspend_reason = models.TextField("정지 운영 메모", blank=True)
    suspend_public = models.TextField("정지 공개 사유", blank=True)
    suspend_count = models.PositiveIntegerField("누적 정지 횟수", default=0)
    created_at = models.DateTimeField("가입일", auto_now_add=True)

    def __str__(self) -> str:
        """관리자 화면에서 식별하기 쉬운 문자열을 반환한다."""
        return self.nickname or self.username


class BannedIP(models.Model):
    """운영자 IP 차단 목록."""

    ip_address = models.CharField("차단 IP 또는 CIDR", max_length=64, unique=True)
    reason = models.CharField("차단 사유", max_length=255)
    expires_at = models.DateTimeField("차단 해제일", null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", related_name="created_ip_bans", on_delete=models.CASCADE)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return self.ip_address
