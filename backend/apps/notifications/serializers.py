from rest_framework import serializers

from .models import Notification, NotificationDelivery, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """알림 응답 직렬화기."""

    class Meta:
        model = Notification
        fields = (
            "id",
            "notification_type",
            "title",
            "message",
            "target_url",
            "is_read",
            "created_at",
        )


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = (
            "allow_in_app",
            "allow_email",
            "allow_kakao",
            "allow_sms",
            "email",
            "phone_number",
            "kakao_target",
            "quiet_hours_start",
            "quiet_hours_end",
        )

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        def _value(key, default=None):
            if key in attrs:
                return attrs[key]
            if instance is not None:
                return getattr(instance, key)
            return default

        allow_email = bool(_value("allow_email", False))
        allow_kakao = bool(_value("allow_kakao", False))
        allow_sms = bool(_value("allow_sms", False))
        email = (_value("email", "") or "").strip()
        kakao_target = (_value("kakao_target", "") or "").strip()
        phone_number = (_value("phone_number", "") or "").strip()
        quiet_start = int(_value("quiet_hours_start", 23))
        quiet_end = int(_value("quiet_hours_end", 8))

        if allow_email and not email:
            raise serializers.ValidationError({"email": "이메일 알림을 켜면 수신 이메일을 입력해야 합니다."})
        if allow_kakao and not kakao_target:
            raise serializers.ValidationError({"kakao_target": "카카오 알림을 켜면 카카오 식별값을 입력해야 합니다."})
        if allow_sms and not phone_number:
            raise serializers.ValidationError({"phone_number": "문자 알림을 켜면 수신 번호를 입력해야 합니다."})
        if quiet_start < 0 or quiet_start > 23:
            raise serializers.ValidationError({"quiet_hours_start": "야간 시작 시각은 0~23 사이여야 합니다."})
        if quiet_end < 0 or quiet_end > 23:
            raise serializers.ValidationError({"quiet_hours_end": "야간 종료 시각은 0~23 사이여야 합니다."})
        return attrs


class NotificationDeliverySerializer(serializers.ModelSerializer):
    notification_title = serializers.CharField(source="notification.title", read_only=True)

    class Meta:
        model = NotificationDelivery
        fields = (
            "id",
            "notification",
            "notification_title",
            "channel",
            "status",
            "target",
            "provider",
            "response_code",
            "response_message",
            "dedupe_key",
            "sent_at",
            "created_at",
        )
