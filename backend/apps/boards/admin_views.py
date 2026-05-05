from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import generics, response, status
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOnly, IsAdminOrModerator
from apps.admin_logs.models import AdminLog
from apps.admin_logs.services import create_admin_log

from .admin_serializers import AdminBoardSerializer
from .models import Board


class AdminBoardListCreateView(generics.ListCreateAPIView):
    """운영자 게시판 목록/생성 API."""

    serializer_class = AdminBoardSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        return Board.objects.annotate(post_count=Count("posts")).order_by("sort_order", "id")

    def perform_create(self, serializer):
        base_slug = slugify(serializer.validated_data["name"], allow_unicode=True) or "board"
        slug = base_slug
        suffix = 2
        while Board.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        board = serializer.save(slug=slug)
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_BOARD_CREATE,
            target_id=board.id,
            detail={"name": board.name, "slug": board.slug},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )


class AdminBoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """운영자 게시판 상세/수정/삭제 API."""

    queryset = Board.objects.annotate(post_count=Count("posts"))
    serializer_class = AdminBoardSerializer
    permission_classes = [IsAdminOnly]
    lookup_url_kwarg = "board_id"

    def perform_update(self, serializer):
        board = serializer.save()
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_BOARD_UPDATE,
            target_id=board.id,
            detail={"name": board.name, "is_visible": board.is_visible, "sort_order": board.sort_order},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    def destroy(self, request, *args, **kwargs):
        board = self.get_object()
        post_count = board.posts.count()
        force = request.query_params.get("force") == "true"

        if post_count > 0 and not force:
            return response.Response(
                {"detail": "게시글이 있는 게시판은 바로 삭제할 수 없습니다.", "post_count": post_count},
                status=status.HTTP_403_FORBIDDEN,
            )

        board_name = board.name
        board_id = board.id
        board.delete()
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_BOARD_DELETE,
            target_id=board_id,
            detail={"name": board_name, "forced": force, "post_count": post_count},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class AdminBoardReorderView(APIView):
    """운영자 게시판 순서 변경 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, *args, **kwargs):
        order_list = request.data.get("order", [])
        for index, board_id in enumerate(order_list):
            Board.objects.filter(id=board_id).update(sort_order=index)
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_BOARD_UPDATE,
            target_id=0,
            detail={"order": order_list},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response({"detail": "정렬 순서를 변경했습니다."}, status=status.HTTP_200_OK)


class AdminBoardToggleVisibilityView(APIView):
    """운영자 게시판 공개 여부 토글 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, board_id, *args, **kwargs):
        board = get_object_or_404(Board, id=board_id)
        board.is_visible = not board.is_visible
        board.save(update_fields=["is_visible"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_BOARD_HIDE,
            target_id=board.id,
            detail={"is_visible": board.is_visible},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response({"is_visible": board.is_visible}, status=status.HTTP_200_OK)
