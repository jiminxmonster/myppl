from .models import AdminLog


def create_admin_log(*, admin, action: str, target_id: int, detail: dict, ip_address: str | None):
    """운영자 행위 로그를 일관된 형식으로 기록한다."""
    return AdminLog.objects.create(
        admin=admin,
        action=action,
        target_id=target_id,
        detail=detail,
        ip_address=ip_address,
    )
