from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission, IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.accounts.permissions import IsAdminOrModerator
from apps.boards.models import Board, Post
from .models import LiveRoom, LiveRoomProduct, LiveChatMessage
from .serializers import (
    LiveRoomSerializer,
    LiveRoomDetailSerializer,
    LiveChatMessageSerializer,
    AdminLiveRoomSerializer,
)
from apps.admin_logs.services import create_admin_log
from apps.admin_logs.models import AdminLog


class IsAdminOrOwnerSeller(BasePermission):
    """
    - 운영자 (admin/superadmin/moderator) 또는 superuser: 전체 접근 허용 (생성/수정/삭제)
    - seller: 생성 허용, 수정/삭제는 본인 (created_by) 방송만
    - buyer: 완전 거부 (403)
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'operator_role', '') or ''
        member = getattr(request.user, 'member_type', '') or ''
        if role in ('admin', 'superadmin', 'moderator') or request.user.is_superuser:
            return True
        if member == 'seller':
            return True
        # buyer 명시 거부
        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, 'operator_role', '') or ''
        if role in ('admin', 'superadmin', 'moderator') or user.is_superuser:
            return True
        member = getattr(user, 'member_type', '') or ''
        if member == 'seller':
            if hasattr(obj, 'created_by_id'):
                return obj.created_by_id == user.id
            if hasattr(obj, 'owner_id'):
                return obj.owner_id == user.id
            if hasattr(obj, 'live_room'):
                return getattr(obj.live_room, 'created_by_id', None) == user.id
        return False


class LiveRoomListView(generics.ListAPIView):
    """공개 방송 목록"""
    serializer_class = LiveRoomSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = LiveRoom.objects.filter(is_visible=True)
        status = self.request.query_params.get("status")
        if status in [LiveRoom.STATUS_LIVE, LiveRoom.STATUS_SCHEDULED, LiveRoom.STATUS_ENDED]:
            qs = qs.filter(status=status)
        else:
            # 기본: 라이브 + 예정
            qs = qs.filter(status__in=[LiveRoom.STATUS_LIVE, LiveRoom.STATUS_SCHEDULED])
        return qs.order_by("-sort_order", "-starts_at")


class LiveRoomDetailView(generics.RetrieveAPIView):
    """방송 상세"""
    serializer_class = LiveRoomDetailSerializer
    permission_classes = [AllowAny]
    queryset = LiveRoom.objects.filter(is_visible=True)


class LiveChatMessageListView(generics.ListAPIView):
    """최근 채팅 (새로고침용)"""
    serializer_class = LiveChatMessageSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        room_id = self.kwargs["pk"]
        return LiveChatMessage.objects.filter(
            live_room_id=room_id, is_hidden=False
        ).order_by("-created_at")[:50]


class LiveChatMessageCreateView(APIView):
    """채팅 메시지 작성 (로그인 필수)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(LiveRoom, id=pk, is_visible=True)
        if not room.chat_enabled:
            return Response({"detail": "채팅이 비활성화된 방송입니다."}, status=status.HTTP_403_FORBIDDEN)

        message = request.data.get("message", "").strip()
        if not message:
            return Response({"detail": "메시지를 입력하세요."}, status=status.HTTP_400_BAD_REQUEST)

        # TODO: 금칙어 필터 재사용 가능하면 추가

        msg = LiveChatMessage.objects.create(
            live_room=room,
            user=request.user,
            message=message,
        )
        return Response(LiveChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)


# Admin / Seller APIs
class AdminLiveRoomListCreateView(generics.ListCreateAPIView):
    """운영자/판매자 방송 목록/생성"""
    serializer_class = AdminLiveRoomSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerSeller]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or getattr(user, "operator_role", "") in ["admin", "superadmin", "moderator"]:
            return LiveRoom.objects.all().order_by("-created_at")
        # 판매자는 본인 것만
        return LiveRoom.objects.filter(created_by=user).order_by("-created_at")

    def perform_create(self, serializer):
        room = serializer.save(created_by=self.request.user)
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_POST_CREATE,  # 재사용, 또는 새 액션 추가 가능
            target_id=room.id,
            detail={"type": "live_room_create", "title": room.title},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )


class AdminLiveRoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    """방송 수정/삭제"""
    serializer_class = AdminLiveRoomSerializer
    permission_classes = [IsAuthenticated, IsAdminOrOwnerSeller]
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or getattr(user, "operator_role", "") in ["admin", "superadmin", "moderator"]:
            return LiveRoom.objects.all()
        return LiveRoom.objects.filter(created_by=user)


class AdminLiveRoomProductView(APIView):
    """방송에 상품 연결"""
    permission_classes = [IsAuthenticated, IsAdminOrOwnerSeller]

    def post(self, request, pk):
        room = get_object_or_404(LiveRoom, id=pk)

        # seller인 경우 본인 방송만 상품 연결 허용
        user = request.user
        role = getattr(user, 'operator_role', '') or ''
        member = getattr(user, 'member_type', '') or ''
        if not (role in ('admin', 'superadmin', 'moderator') or user.is_superuser):
            if member == 'seller':
                if room.created_by_id != user.id and room.owner_id != user.id:
                    return Response({"detail": "본인 방송에만 상품을 연결할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        post_id = request.data.get("post_id")
        if not post_id:
            return Response({"detail": "post_id 필요"}, status=400)
        post = get_object_or_404(Post, id=post_id)

        lp, created = LiveRoomProduct.objects.get_or_create(
            live_room=room,
            post=post,
            defaults={
                "title": post.title,
                "price": str(post.product_sale_price or ""),
                "external_url": post.product_live_url or "",
            },
        )
        return Response({"id": lp.id, "created": created}, status=201 if created else 200)


class AdminLiveRoomProductDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrOwnerSeller]

    def delete(self, request, pk, product_id):
        lp = get_object_or_404(LiveRoomProduct, live_room_id=pk, id=product_id)
        room = lp.live_room
        user = request.user
        role = getattr(user, 'operator_role', '') or ''
        if not (role in ('admin', 'superadmin', 'moderator') or user.is_superuser):
            member = getattr(user, 'member_type', '') or ''
            if member == 'seller':
                if room.created_by_id != user.id and room.owner_id != user.id:
                    return Response({"detail": "본인 방송의 상품만 삭제할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        lp.delete()
        return Response(status=204)


class AdminHideChatMessageView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrOwnerSeller]

    def patch(self, request, pk, message_id):
        msg = get_object_or_404(LiveChatMessage, live_room_id=pk, id=message_id)
        msg.is_hidden = True
        msg.hidden_by = request.user
        msg.hidden_reason = request.data.get("reason", "")
        msg.save(update_fields=["is_hidden", "hidden_by", "hidden_reason"])
        return Response({"is_hidden": True})


class LiveSettingsView(APIView):
    """방송 메뉴 ON/OFF 등 설정 (SiteDisplaySetting 재사용) - 운영자 전용"""
    permission_classes = [IsAuthenticated, IsAdminOrModerator]

    def get(self, request):
        from apps.catalog.models import SiteDisplaySetting
        setting = SiteDisplaySetting.get_solo()
        return Response({
            "show_live_menu": setting.show_live_menu,
        })

    def patch(self, request):
        from apps.catalog.models import SiteDisplaySetting
        setting = SiteDisplaySetting.get_solo()
        if "show_live_menu" in request.data:
            setting.show_live_menu = bool(request.data["show_live_menu"])
            setting.save(update_fields=["show_live_menu"])
        return Response({"show_live_menu": setting.show_live_menu})
