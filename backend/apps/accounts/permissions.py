from rest_framework.permissions import BasePermission

from .models import User


class IsAdminOrModerator(BasePermission):
    """운영자 대시보드 접근 가능 여부를 검사한다."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.operator_role in {
                User.OPERATOR_MODERATOR,
                User.OPERATOR_ADMIN,
                User.OPERATOR_SUPERADMIN,
            }
        )


class IsAdminOnly(BasePermission):
    """일반 관리자 이상만 접근할 수 있다."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.operator_role in {
                User.OPERATOR_ADMIN,
                User.OPERATOR_SUPERADMIN,
            }
        )


class IsSuperAdmin(BasePermission):
    """최고 관리자 전용 권한."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.operator_role == User.OPERATOR_SUPERADMIN)
