from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.core.management import call_command
from io import StringIO
from rest_framework import generics, response, status
from rest_framework.views import APIView

from apps.admin_logs.models import AdminLog
from apps.admin_logs.services import create_admin_log
from apps.boards.models import Board, Post, Report

from .admin_serializers import BannedIPSerializer, AdminUserSerializer, SuspendUserSerializer, UpdateGradeSerializer, UpdatePointsSerializer
from .models import BannedIP, User
from .permissions import IsAdminOnly, IsAdminOrModerator, IsSuperAdmin


class AdminDashboardView(APIView):
    """운영자 대시보드 요약 API."""

    permission_classes = [IsAdminOrModerator]

    def get(self, request, *args, **kwargs):
        return response.Response(
            {
                "stats": {
                    "total_users": User.objects.count(),
                    "suspended_users": User.objects.filter(is_suspended=True).count(),
                    "total_boards": Board.objects.count(),
                    "hidden_boards": Board.objects.filter(is_visible=False).count(),
                    "total_posts": Post.objects.count(),
                    "blinded_posts": Post.objects.filter(is_blinded=True).count(),
                    "pending_reports": Report.objects.filter(status=Report.STATUS_PENDING).count(),
                },
                "recent_admin_logs": [
                    {
                        "id": log.id,
                        "action": log.action,
                        "target_id": log.target_id,
                        "created_at": log.created_at,
                        "admin_nickname": log.admin.nickname,
                    }
                    for log in AdminLog.objects.select_related("admin")[:10]
                ],
            },
            status=status.HTTP_200_OK,
        )


class AdminMemberListView(generics.ListAPIView):
    """운영자 회원 목록/검색 API."""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminOrModerator]

    def get_queryset(self):
        queryset = User.objects.all().order_by("-created_at")
        query = self.request.query_params.get("q", "").strip()
        grade = self.request.query_params.get("grade", "").strip()
        status_filter = self.request.query_params.get("status", "").strip()

        if query:
            queryset = queryset.filter(
                Q(username__icontains=query)
                | Q(email__icontains=query)
                | Q(nickname__icontains=query)
            )
        if grade:
            queryset = queryset.filter(grade=grade)
        if status_filter == "suspended":
            queryset = queryset.filter(is_suspended=True)
        if status_filter == "inactive":
            queryset = queryset.filter(is_active=False)
        return queryset


class AdminMemberDetailView(generics.RetrieveAPIView):
    """운영자 회원 상세 API."""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = User.objects.all()
    lookup_url_kwarg = "user_id"


class AdminMemberSuspendView(APIView):
    """운영자 회원 정지/해제 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, user_id, *args, **kwargs):
        member = get_object_or_404(User, id=user_id)
        serializer = SuspendUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_suspended = serializer.validated_data["is_suspended"]
        member.is_suspended = is_suspended
        member.suspend_until = serializer.validated_data.get("suspend_until")
        member.suspend_reason = serializer.validated_data.get("suspend_reason", "")
        member.suspend_public = serializer.validated_data.get("suspend_public", "")
        if is_suspended:
            member.suspend_count += 1
        member.save()

        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_USER_SUSPEND if is_suspended else AdminLog.ACTION_USER_UNSUSPEND,
            target_id=member.id,
            detail={
                "suspend_until": member.suspend_until.isoformat() if member.suspend_until else None,
                "suspend_public": member.suspend_public,
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(AdminUserSerializer(member).data, status=status.HTTP_200_OK)


class AdminMemberGradeView(APIView):
    """운영자 회원 등급 변경 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, user_id, *args, **kwargs):
        member = get_object_or_404(User, id=user_id)
        serializer = UpdateGradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        previous_grade = member.grade
        member.grade = serializer.validated_data["grade"]
        member.save(update_fields=["grade"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_USER_GRADE,
            target_id=member.id,
            detail={"before": previous_grade, "after": member.grade, "reason": serializer.validated_data.get("reason", "")},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(AdminUserSerializer(member).data, status=status.HTTP_200_OK)


class AdminMemberPointsView(APIView):
    """운영자 회원 포인트 조정 API."""

    permission_classes = [IsAdminOnly]

    def post(self, request, user_id, *args, **kwargs):
        member = get_object_or_404(User, id=user_id)
        serializer = UpdatePointsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data["amount"]
        point_type = serializer.validated_data["type"]
        before = member.points

        if point_type == "add":
            member.points += amount
        elif point_type == "subtract":
            member.points -= amount
        else:
            member.points = amount

        member.save(update_fields=["points"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_USER_POINT,
            target_id=member.id,
            detail={
                "before": before,
                "after": member.points,
                "type": point_type,
                "reason": serializer.validated_data.get("reason", ""),
            },
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(AdminUserSerializer(member).data, status=status.HTTP_200_OK)


class AdminOperatorRoleView(APIView):
    """최고관리자 운영 권한 변경 API."""

    permission_classes = [IsSuperAdmin]

    def patch(self, request, user_id, *args, **kwargs):
        member = get_object_or_404(User, id=user_id)
        operator_role = request.data.get("operator_role", User.OPERATOR_NONE)
        if operator_role not in dict(User.OPERATOR_ROLE_CHOICES):
            return response.Response({"detail": "올바르지 않은 운영 권한입니다."}, status=status.HTTP_400_BAD_REQUEST)

        previous_role = member.operator_role
        member.operator_role = operator_role
        member.is_staff = operator_role != User.OPERATOR_NONE
        member.save(update_fields=["operator_role", "is_staff"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_USER_GRADE,
            target_id=member.id,
            detail={"before_operator_role": previous_role, "after_operator_role": operator_role},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(AdminUserSerializer(member).data, status=status.HTTP_200_OK)


class AdminIPBanListCreateView(generics.ListCreateAPIView):
    """운영자 IP 차단 목록/등록 API."""

    serializer_class = BannedIPSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        return BannedIP.objects.select_related("created_by")

    def perform_create(self, serializer):
        banned_ip = serializer.save(created_by=self.request.user)
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_IP_BAN,
            target_id=banned_ip.id,
            detail={"ip_address": banned_ip.ip_address, "reason": banned_ip.reason},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )


class AdminIPBanDetailView(generics.DestroyAPIView):
    """운영자 IP 차단 해제 API."""

    queryset = BannedIP.objects.all()
    permission_classes = [IsAdminOnly]
    lookup_url_kwarg = "ban_id"

    def destroy(self, request, *args, **kwargs):
        banned_ip = self.get_object()
        banned_ip_id = banned_ip.id
        ip_address = banned_ip.ip_address
        banned_ip.delete()
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_IP_BAN,
            target_id=banned_ip_id,
            detail={"released": True, "ip_address": ip_address},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class AdminLogListView(generics.ListAPIView):
    """운영자 로그 조회 API."""

    permission_classes = [IsAdminOrModerator]

    def get_queryset(self):
        queryset = AdminLog.objects.select_related("admin")
        action = self.request.query_params.get("action", "").strip()
        if action:
            queryset = queryset.filter(action=action)
        return queryset

    def list(self, request, *args, **kwargs):
        logs = self.get_queryset()[:100]
        return response.Response(
            [
                {
                    "id": log.id,
                    "action": log.action,
                    "target_id": log.target_id,
                    "detail": log.detail,
                    "ip_address": log.ip_address,
                    "admin_nickname": log.admin.nickname,
                    "created_at": log.created_at,
                }
                for log in logs
            ],
            status=status.HTTP_200_OK,
        )


class BootstrapSpecsExportView(APIView):
    """현재 admin 상태(게시판 상위노출, 홈 섹션 등)를 부트스트랩 스펙 코드로 내보내는 API.
    admin에서 '현재 상태를 영구 기본값으로 만들기' 버튼용.
    """

    permission_classes = [IsAdminOnly]

    def get(self, request, *args, **kwargs):
        out = StringIO()
        call_command("dump_bootstrap_specs", stdout=out)
        return response.Response(
            {"specs_code": out.getvalue()},
            status=status.HTTP_200_OK,
        )
