from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """회원 정보 응답 직렬화기."""

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "nickname",
            "member_type",
            "grade",
            "operator_role",
            "points",
            "profile_image",
            "is_suspended",
            "suspend_until",
            "suspend_public",
            "suspend_count",
            "created_at",
        )
        read_only_fields = ("id", "grade", "operator_role", "points", "created_at", "suspend_count")


class RegisterSerializer(serializers.ModelSerializer):
    """회원가입 요청 검증 직렬화기."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "nickname", "member_type", "password", "password_confirm")

    def validate(self, attrs):
        """비밀번호 확인 일치 여부를 검사한다."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "비밀번호 확인이 일치하지 않습니다."})
        return attrs

    def create(self, validated_data):
        """비밀번호를 해시하여 회원을 생성한다."""
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """로그인 요청 검증 및 토큰 생성 직렬화기."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)

    def validate(self, attrs):
        """아이디/비밀번호로 사용자를 인증하고 JWT를 발급한다."""
        user = authenticate(username=attrs.get("username"), password=attrs.get("password"))
        if user is None:
            raise serializers.ValidationError({"detail": "아이디 또는 비밀번호가 올바르지 않습니다."})
        if user.is_suspended:
            if user.suspend_until and user.suspend_until <= timezone.now():
                user.is_suspended = False
                user.suspend_until = None
                user.save(update_fields=["is_suspended", "suspend_until"])
            else:
                raise serializers.ValidationError(
                    {
                        "detail": "정지된 회원입니다.",
                        "suspend_until": user.suspend_until,
                        "suspend_public": user.suspend_public,
                    }
                )

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user,
        }
