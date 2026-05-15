from django.db.models import BooleanField, Case, Count, F, Q, Value, When
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, response, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOnly, IsAdminOrModerator
from apps.admin_logs.models import AdminLog
from apps.admin_logs.services import create_admin_log
from apps.notifications.models import Notification
from apps.notifications.services import create_notification

from .models import Board, Comment, KeywordFilter, Post, PostLike, Report
from .serializers import (
    BoardSerializer,
    CommentSerializer,
    CommentWriteSerializer,
    KeywordFilterSerializer,
    PostDetailSerializer,
    PostListSerializer,
    PostWriteSerializer,
    ReportSerializer,
    ReportWriteSerializer,
)
from .utils import apply_keyword_filter


def is_operator_user(user) -> bool:
    return bool(user and user.is_authenticated and getattr(user, "operator_role", "") in {"moderator", "admin", "superadmin"})


def with_notice_ordering(queryset):
    """공지 기간이 유효한 글만 상단 고정되도록 정렬용 필드를 붙인다."""
    now = timezone.now()
    return queryset.annotate(
        active_notice=Case(
            When(
                Q(is_notice=True)
                & (Q(notice_start__isnull=True) | Q(notice_start__lte=now))
                & (Q(notice_end__isnull=True) | Q(notice_end__gte=now)),
                then=Value(True),
            ),
            default=Value(False),
            output_field=BooleanField(),
        )
    ).order_by("-active_notice", "notice_order", "-created_at", "-id")


class BoardListView(generics.ListAPIView):
    """게시판 목록 API."""

    serializer_class = BoardSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        queryset = Board.objects.all()
        user = self.request.user
        if is_operator_user(user):
            return queryset
        return queryset.filter(is_visible=True)


class BoardDetailView(generics.RetrieveAPIView):
    """게시판 메타 정보 조회 API."""

    serializer_class = BoardSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    pagination_class = None

    def get_queryset(self):
        queryset = Board.objects.all()
        user = self.request.user
        if is_operator_user(user):
            return queryset
        return queryset.filter(is_visible=True)


class PostListCreateView(generics.ListCreateAPIView):
    """게시글 목록/작성 API."""

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """슬러그에 해당하는 게시판의 게시글을 조회한다."""
        board_queryset = Board.objects.all()
        user = self.request.user
        is_operator = is_operator_user(user)
        if not is_operator:
            board_queryset = board_queryset.filter(is_visible=True)
        board = get_object_or_404(board_queryset, slug=self.kwargs["slug"])
        queryset = Post.objects.filter(board=board).select_related("author", "board").prefetch_related("images", "comments")
        if not is_operator:
            queryset = queryset.filter(is_deleted=False)
        return with_notice_ordering(queryset)

    def get_serializer_class(self):
        return PostWriteSerializer if self.request.method == "POST" else PostListSerializer

    def perform_create(self, serializer):
        """현재 로그인 사용자를 작성자로 저장한다."""
        board = get_object_or_404(Board.objects.filter(is_visible=True), slug=self.kwargs["slug"])
        if not board.can_user_write(self.request.user):
            raise PermissionDenied("이 게시판에 글을 작성할 권한이 없습니다.")

        validated = serializer.validated_data
        validated["title"] = apply_keyword_filter(validated["title"], target=KeywordFilter.TARGET_POST)
        validated["content"] = apply_keyword_filter(validated["content"], target=KeywordFilter.TARGET_POST)
        serializer.save(author=self.request.user, board=board)

    def create(self, request, *args, **kwargs):
        """생성 완료 후 상세 응답 형식으로 게시글을 반환한다."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return response.Response(PostDetailSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)


class PostDetailView(APIView):
    """게시글 상세/수정/삭제 API."""

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self, post_id):
        """대상 게시글을 조회한다."""
        queryset = Post.objects.select_related("author", "board").prefetch_related("images", "comments")
        user = self.request.user
        if not is_operator_user(user):
            queryset = queryset.filter(is_deleted=False)
        return get_object_or_404(queryset, id=post_id)

    def get(self, request, post_id, *args, **kwargs):
        """상세 조회 시 조회수를 증가시키고 게시글을 반환한다."""
        post = self.get_object(post_id)
        Post.objects.filter(id=post.id).update(views=F("views") + 1)
        post.refresh_from_db()
        if post.is_blinded and not is_operator_user(request.user):
            post.title = "[블라인드 처리된 게시글]"
            post.content = post.blind_reason or "운영 정책에 의해 블라인드 처리되었습니다."
        return response.Response(PostDetailSerializer(post).data, status=status.HTTP_200_OK)

    def put(self, request, post_id, *args, **kwargs):
        """작성자 또는 운영자가 게시글을 수정할 수 있다."""
        post = self.get_object(post_id)
        if post.author != request.user and not is_operator_user(request.user):
            return response.Response({"detail": "수정 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PostWriteSerializer(post, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.validated_data["title"] = apply_keyword_filter(serializer.validated_data["title"], target=KeywordFilter.TARGET_POST)
        serializer.validated_data["content"] = apply_keyword_filter(serializer.validated_data["content"], target=KeywordFilter.TARGET_POST)
        serializer.save()
        post.refresh_from_db()
        return response.Response(PostDetailSerializer(post).data, status=status.HTTP_200_OK)

    def delete(self, request, post_id, *args, **kwargs):
        """작성자 또는 운영자가 게시글을 삭제할 수 있다."""
        post = self.get_object(post_id)
        if post.author != request.user and not is_operator_user(request.user):
            return response.Response({"detail": "삭제 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        post.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class PostLikeView(APIView):
    """게시글 추천 API."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id, *args, **kwargs):
        """중복 추천을 막고 추천 수를 증가시킨다."""
        post = get_object_or_404(Post, id=post_id)
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if not created:
            return response.Response({"detail": "이미 추천한 게시글입니다."}, status=status.HTTP_400_BAD_REQUEST)

        Post.objects.filter(id=post.id).update(likes=F("likes") + 1)
        post.refresh_from_db()
        if post.author_id != request.user.id:
            create_notification(
                user=post.author,
                notification_type=Notification.TYPE_LIKE,
                title="게시글 추천 알림",
                message=f"{request.user.nickname}님이 '{post.title}' 글을 추천했습니다.",
                target_url=f"/boards/{post.board.slug}/{post.id}",
            )
        return response.Response({"likes": post.likes}, status=status.HTTP_200_OK)


class CommentListCreateView(APIView):
    """댓글 목록/작성 API."""

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_post(self, post_id):
        """대상 게시글을 조회한다."""
        return get_object_or_404(Post, id=post_id)

    def get(self, request, post_id, *args, **kwargs):
        """최상위 댓글 기준으로 트리 형태 댓글을 반환한다."""
        post = self.get_post(post_id)
        comments = post.comments.filter(parent__isnull=True)
        return response.Response(CommentSerializer(comments, many=True, context={"request": request}).data, status=status.HTTP_200_OK)

    def post(self, request, post_id, *args, **kwargs):
        """댓글 또는 대댓글을 생성한다."""
        post = self.get_post(post_id)
        serializer = CommentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.validated_data["content"] = apply_keyword_filter(serializer.validated_data["content"], target=KeywordFilter.TARGET_COMMENT)
        comment = serializer.save(author=request.user, post=post)
        if post.author_id != request.user.id:
            create_notification(
                user=post.author,
                notification_type=Notification.TYPE_COMMENT,
                title="새 댓글 알림",
                message=f"{request.user.nickname}님이 '{post.title}' 글에 댓글을 남겼습니다.",
                target_url=f"/boards/{post.board.slug}/{post.id}",
        )
        return response.Response(CommentSerializer(comment, context={"request": request}).data, status=status.HTTP_201_CREATED)


class CommentDetailView(APIView):
    """댓글 삭제 API."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id, *args, **kwargs):
        comment = get_object_or_404(Comment, id=comment_id)
        if comment.author != request.user and not is_operator_user(request.user):
            return response.Response({"detail": "댓글 삭제 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class ReportCreateView(generics.CreateAPIView):
    """게시글/댓글 신고 생성 API."""

    serializer_class = ReportWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class AdminReportListView(generics.ListAPIView):
    """운영자 신고 목록 API."""

    serializer_class = ReportSerializer
    permission_classes = [IsAdminOrModerator]

    def get_queryset(self):
        queryset = Report.objects.select_related("reporter", "handled_by", "post", "comment").annotate(
            pending_count=Count("post__reports", filter=Q(post__reports__status=Report.STATUS_PENDING))
            + Count("comment__reports", filter=Q(comment__reports__status=Report.STATUS_PENDING)),
        ).annotate(
            is_emergency=Case(
                When(Q(status=Report.STATUS_PENDING) & Q(pending_count__gte=5), then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        report_status = self.request.query_params.get("status", "").strip()
        emergency = self.request.query_params.get("emergency", "").strip()
        if report_status:
            queryset = queryset.filter(status=report_status)
        if emergency == "true":
            queryset = queryset.filter(status=Report.STATUS_PENDING, pending_count__gte=5)
        return queryset


class AdminReportHandleView(APIView):
    """운영자 신고 처리 API."""

    permission_classes = [IsAdminOrModerator]

    def patch(self, request, report_id, *args, **kwargs):
        report = get_object_or_404(Report, id=report_id)
        next_status = request.data.get("status", Report.STATUS_RESOLVED)
        if next_status not in dict(Report.STATUS_CHOICES):
            return response.Response({"detail": "올바르지 않은 상태값입니다."}, status=status.HTTP_400_BAD_REQUEST)

        report.status = next_status
        report.handled_by = request.user
        report.handled_note = request.data.get("handled_note", "")
        blind_target = request.data.get("blind_target", False)
        report.handled_at = timezone.now()
        report.save(update_fields=["status", "handled_by", "handled_note", "handled_at"])
        if blind_target:
            blind_reason = report.get_reason_display()
            if report.post_id:
                report.post.is_blinded = True
                report.post.blind_reason = blind_reason
                report.post.save(update_fields=["is_blinded", "blind_reason"])
            if report.comment_id:
                report.comment.content = "[운영 정책에 의해 블라인드 처리된 댓글입니다.]"
                report.comment.save(update_fields=["content"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_REPORT_HANDLE,
            target_id=report.id,
            detail={"status": report.status, "handled_note": report.handled_note, "blind_target": blind_target},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(ReportSerializer(report).data, status=status.HTTP_200_OK)


class AdminPostBlindView(APIView):
    """운영자 게시글 블라인드 처리 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, post_id, *args, **kwargs):
        post = get_object_or_404(Post, id=post_id)
        post.is_blinded = request.data.get("is_blinded", True)
        post.blind_reason = request.data.get("blind_reason", "")
        post.save(update_fields=["is_blinded", "blind_reason"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_POST_BLIND,
            target_id=post.id,
            detail={"is_blinded": post.is_blinded, "blind_reason": post.blind_reason},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(PostDetailSerializer(post).data, status=status.HTTP_200_OK)


class AdminPostNoticeView(APIView):
    """운영자 게시글 공지 전환 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, post_id, *args, **kwargs):
        post = get_object_or_404(Post, id=post_id)
        post.is_notice = request.data.get("is_notice", True)
        post.notice_type = request.data.get("notice_type", Post.NOTICE_BOARD if post.board_id else "")
        post.notice_order = request.data.get("notice_order", post.notice_order)
        notice_start = request.data.get("notice_start")
        notice_end = request.data.get("notice_end")
        post.notice_start = parse_datetime(notice_start) if notice_start else None
        post.notice_end = parse_datetime(notice_end) if notice_end else None
        post.save(update_fields=["is_notice", "notice_type", "notice_order", "notice_start", "notice_end"])
        return response.Response(PostDetailSerializer(post).data, status=status.HTTP_200_OK)


class AdminPostMoveView(APIView):
    """운영자 게시글 이동 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, post_id, *args, **kwargs):
        post = get_object_or_404(Post, id=post_id)
        target_board = get_object_or_404(Board, id=request.data.get("target_board_id"))
        previous_board_name = post.board.name
        post.board = target_board
        post.moved_from_board_name = previous_board_name
        post.save(update_fields=["board", "moved_from_board_name"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_POST_MOVE,
            target_id=post.id,
            detail={"from": previous_board_name, "to": target_board.name},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(PostDetailSerializer(post).data, status=status.HTTP_200_OK)


class AdminPostDeleteView(APIView):
    """운영자 게시글 임시삭제/완전삭제 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, post_id, *args, **kwargs):
        post = get_object_or_404(Post, id=post_id)
        mode = request.data.get("mode", "soft")
        if mode == "hard":
            create_admin_log(
                admin=request.user,
                action=AdminLog.ACTION_POST_DELETE,
                target_id=post.id,
                detail={"mode": "hard", "title": post.title},
                ip_address=request.META.get("REMOTE_ADDR"),
            )
            post.delete()
            return response.Response(status=status.HTTP_204_NO_CONTENT)

        post.is_deleted = True
        post.deleted_at = timezone.now()
        post.deleted_by = request.user
        post.save(update_fields=["is_deleted", "deleted_at", "deleted_by"])
        create_admin_log(
            admin=request.user,
            action=AdminLog.ACTION_POST_DELETE,
            target_id=post.id,
            detail={"mode": "soft", "title": post.title},
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return response.Response(PostDetailSerializer(post).data, status=status.HTTP_200_OK)


class AdminPostListView(generics.ListAPIView):
    """운영자 게시글 관리 목록 API."""

    serializer_class = PostListSerializer
    permission_classes = [IsAdminOrModerator]

    def get_queryset(self):
        queryset = Post.objects.select_related("author", "board").prefetch_related("images", "comments")
        board_id = self.request.query_params.get("board_id", "").strip()
        if board_id:
            queryset = queryset.filter(board_id=board_id)
        return with_notice_ordering(queryset)


class AdminKeywordFilterListCreateView(generics.ListCreateAPIView):
    """운영자 금칙어 목록/생성 API."""

    serializer_class = KeywordFilterSerializer
    permission_classes = [IsAdminOnly]
    queryset = KeywordFilter.objects.all()

    def perform_create(self, serializer):
        keyword_filter = serializer.save()
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_KEYWORD,
            target_id=keyword_filter.id,
            detail={"keyword": keyword_filter.keyword, "action": keyword_filter.action},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )


class AdminKeywordFilterDetailView(generics.RetrieveUpdateDestroyAPIView):
    """운영자 금칙어 상세/수정/삭제 API."""

    serializer_class = KeywordFilterSerializer
    permission_classes = [IsAdminOnly]
    queryset = KeywordFilter.objects.all()
    lookup_url_kwarg = "keyword_id"

    def perform_update(self, serializer):
        keyword_filter = serializer.save()
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_KEYWORD,
            target_id=keyword_filter.id,
            detail={"keyword": keyword_filter.keyword, "updated": True},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    def perform_destroy(self, instance):
        keyword_id = instance.id
        keyword = instance.keyword
        instance.delete()
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_KEYWORD,
            target_id=keyword_id,
            detail={"keyword": keyword, "deleted": True},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )
