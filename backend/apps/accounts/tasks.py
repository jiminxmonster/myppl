"""계정 운영 자동화 태스크."""

from celery import shared_task
from django.utils import timezone

from .models import BannedIP, User


@shared_task
def release_expired_suspensions():
    """정지 기한이 지난 회원을 자동으로 정지 해제한다."""
    now = timezone.now()
    return User.objects.filter(is_suspended=True, suspend_until__isnull=False, suspend_until__lte=now).update(
        is_suspended=False,
        suspend_until=None,
        suspend_reason="",
        suspend_public="",
    )


@shared_task
def cleanup_expired_ip_bans():
    """만료된 IP 차단 기록을 정리한다."""
    now = timezone.now()
    deleted_count, _ = BannedIP.objects.filter(expires_at__isnull=False, expires_at__lte=now).delete()
    return deleted_count
