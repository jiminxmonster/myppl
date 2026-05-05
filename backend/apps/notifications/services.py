import json
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Notification, NotificationDelivery, NotificationPreference
from .serializers import NotificationSerializer


def _in_quiet_hours(preference: NotificationPreference, now: datetime) -> bool:
    start = int(preference.quiet_hours_start or 0) % 24
    end = int(preference.quiet_hours_end or 0) % 24
    current_hour = now.hour
    if start == end:
        return False
    if start < end:
        return start <= current_hour < end
    return current_hour >= start or current_hour < end


def _create_delivery(
    *,
    user,
    notification: Notification,
    channel: str,
    status: str,
    target: str = "",
    provider: str = "",
    response_code: str = "",
    response_message: str = "",
):
    NotificationDelivery.objects.create(
        user=user,
        notification=notification,
        channel=channel,
        status=status,
        target=target,
        provider=provider,
        response_code=response_code,
        response_message=response_message,
        dedupe_key=f"{notification.id}:{channel}",
        sent_at=timezone.now() if status == NotificationDelivery.STATUS_SENT else None,
    )


def _send_webhook_notification(*, url: str, payload: dict, timeout: int) -> tuple[str, str]:
    request = Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            code = str(response.status)
            body = response.read().decode(response.headers.get_content_charset() or "utf-8")
            return code, body[:500]
    except HTTPError as error:
        body = error.read().decode("utf-8", "ignore")
        raise RuntimeError(f"HTTP {error.code}: {body[:300]}") from error
    except URLError as error:
        raise RuntimeError(f"연결 실패: {error.reason}") from error


def _deliver_email(*, preference: NotificationPreference, notification: Notification):
    target = (preference.email or notification.user.email or "").strip()
    if not target:
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_EMAIL,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="이메일 수신 주소가 비어 있어 발송하지 않았습니다.",
        )
        return

    from_email = getattr(settings, "NOTIFICATION_EMAIL_FROM", "") or getattr(settings, "DEFAULT_FROM_EMAIL", "")
    if not from_email:
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_EMAIL,
            status=NotificationDelivery.STATUS_SKIPPED,
            target=target,
            response_message="NOTIFICATION_EMAIL_FROM 또는 DEFAULT_FROM_EMAIL 설정이 없어 발송하지 않았습니다.",
        )
        return

    try:
        sent_count = send_mail(
            subject=notification.title,
            message=f"{notification.message}\n\n링크: {notification.target_url or '-'}",
            from_email=from_email,
            recipient_list=[target],
            fail_silently=False,
        )
        if sent_count > 0:
            _create_delivery(
                user=notification.user,
                notification=notification,
                channel=NotificationDelivery.CHANNEL_EMAIL,
                status=NotificationDelivery.STATUS_SENT,
                target=target,
                provider="django-email",
                response_code="200",
                response_message="발송 완료",
            )
        else:
            _create_delivery(
                user=notification.user,
                notification=notification,
                channel=NotificationDelivery.CHANNEL_EMAIL,
                status=NotificationDelivery.STATUS_FAILED,
                target=target,
                provider="django-email",
                response_message="메일 서버가 발송 건수를 0으로 반환했습니다.",
            )
    except Exception as error:  # noqa: BLE001
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_EMAIL,
            status=NotificationDelivery.STATUS_FAILED,
            target=target,
            provider="django-email",
            response_message=str(error)[:500],
        )


def _deliver_sms(*, preference: NotificationPreference, notification: Notification):
    target = (preference.phone_number or "").strip()
    webhook_url = getattr(settings, "NOTIFICATION_SMS_WEBHOOK_URL", "").strip()
    if not target:
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_SMS,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="문자 수신 번호가 비어 있어 발송하지 않았습니다.",
        )
        return
    if not webhook_url:
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_SMS,
            status=NotificationDelivery.STATUS_SKIPPED,
            target=target,
            response_message="NOTIFICATION_SMS_WEBHOOK_URL 설정이 없어 발송하지 않았습니다.",
        )
        return

    try:
        code, body = _send_webhook_notification(
            url=webhook_url,
            timeout=int(getattr(settings, "NOTIFICATION_DELIVERY_TIMEOUT", 8)),
            payload={
                "target": target,
                "title": notification.title,
                "message": notification.message,
                "target_url": notification.target_url,
                "notification_id": notification.id,
            },
        )
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_SMS,
            status=NotificationDelivery.STATUS_SENT,
            target=target,
            provider="sms-webhook",
            response_code=code,
            response_message=body,
        )
    except Exception as error:  # noqa: BLE001
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_SMS,
            status=NotificationDelivery.STATUS_FAILED,
            target=target,
            provider="sms-webhook",
            response_message=str(error)[:500],
        )


def _deliver_kakao(*, preference: NotificationPreference, notification: Notification):
    target = (preference.kakao_target or "").strip()
    webhook_url = getattr(settings, "NOTIFICATION_KAKAO_WEBHOOK_URL", "").strip()
    if not target:
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_KAKAO,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="카카오 수신 식별값이 비어 있어 발송하지 않았습니다.",
        )
        return
    if not webhook_url:
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_KAKAO,
            status=NotificationDelivery.STATUS_SKIPPED,
            target=target,
            response_message="NOTIFICATION_KAKAO_WEBHOOK_URL 설정이 없어 발송하지 않았습니다.",
        )
        return

    try:
        code, body = _send_webhook_notification(
            url=webhook_url,
            timeout=int(getattr(settings, "NOTIFICATION_DELIVERY_TIMEOUT", 8)),
            payload={
                "target": target,
                "title": notification.title,
                "message": notification.message,
                "target_url": notification.target_url,
                "notification_id": notification.id,
            },
        )
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_KAKAO,
            status=NotificationDelivery.STATUS_SENT,
            target=target,
            provider="kakao-webhook",
            response_code=code,
            response_message=body,
        )
    except Exception as error:  # noqa: BLE001
        _create_delivery(
            user=notification.user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_KAKAO,
            status=NotificationDelivery.STATUS_FAILED,
            target=target,
            provider="kakao-webhook",
            response_message=str(error)[:500],
        )


def create_notification(*, user, notification_type: str, title: str, message: str, target_url: str = ""):
    """알림 저장 + 채널별 전달(내부/이메일/카카오/SMS) 처리."""
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        target_url=target_url,
    )
    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    now = timezone.localtime()
    quiet_hours = _in_quiet_hours(preference, now)

    if preference.allow_in_app:
        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{user.id}",
                {
                    "type": "notify.message",
                    "payload": NotificationSerializer(notification).data,
                },
            )
        _create_delivery(
            user=user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_IN_APP,
            status=NotificationDelivery.STATUS_SENT,
            provider="channels",
            response_code="200",
            response_message="웹소켓 큐 전송",
        )
    else:
        _create_delivery(
            user=user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_IN_APP,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="내부 알림 비활성화",
        )

    if quiet_hours:
        for channel in (NotificationDelivery.CHANNEL_EMAIL, NotificationDelivery.CHANNEL_KAKAO, NotificationDelivery.CHANNEL_SMS):
            _create_delivery(
                user=user,
                notification=notification,
                channel=channel,
                status=NotificationDelivery.STATUS_SKIPPED,
                response_message="야간 수신 제한 시간대라 발송하지 않았습니다.",
            )
        return notification

    if preference.allow_email:
        _deliver_email(preference=preference, notification=notification)
    else:
        _create_delivery(
            user=user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_EMAIL,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="이메일 알림 비활성화",
        )

    if preference.allow_kakao:
        _deliver_kakao(preference=preference, notification=notification)
    else:
        _create_delivery(
            user=user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_KAKAO,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="카카오 알림 비활성화",
        )

    if preference.allow_sms:
        _deliver_sms(preference=preference, notification=notification)
    else:
        _create_delivery(
            user=user,
            notification=notification,
            channel=NotificationDelivery.CHANNEL_SMS,
            status=NotificationDelivery.STATUS_SKIPPED,
            response_message="문자 알림 비활성화",
        )

    return notification
