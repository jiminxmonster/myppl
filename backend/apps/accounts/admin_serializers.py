from rest_framework import serializers

from .models import BannedIP, User


class AdminUserSerializer(serializers.ModelSerializer):
    """운영자 회원 관리 직렬화기."""

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "nickname",
            "grade",
            "operator_role",
            "points",
            "is_active",
            "is_suspended",
            "suspend_until",
            "suspend_reason",
            "suspend_public",
            "suspend_count",
            "created_at",
            "last_login",
        )


class SuspendUserSerializer(serializers.Serializer):
    """회원 정지/해제 요청 직렬화기."""

    is_suspended = serializers.BooleanField()
    suspend_until = serializers.DateTimeField(required=False, allow_null=True)
    suspend_reason = serializers.CharField(required=False, allow_blank=True)
    suspend_public = serializers.CharField(required=False, allow_blank=True)


class UpdateGradeSerializer(serializers.Serializer):
    """등급 변경 요청 직렬화기."""

    grade = serializers.ChoiceField(choices=User.GRADE_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True)


class UpdatePointsSerializer(serializers.Serializer):
    """포인트 변경 요청 직렬화기."""

    amount = serializers.IntegerField()
    type = serializers.ChoiceField(choices=(("add", "add"), ("subtract", "subtract"), ("set", "set")))
    reason = serializers.CharField(required=False, allow_blank=True)


class BannedIPSerializer(serializers.ModelSerializer):
    """운영자 IP 차단 직렬화기."""

    created_by_nickname = serializers.CharField(source="created_by.nickname", read_only=True)

    class Meta:
        model = BannedIP
        fields = ("id", "ip_address", "reason", "expires_at", "created_by", "created_by_nickname", "created_at")
        read_only_fields = ("created_by", "created_at")
