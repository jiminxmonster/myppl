from rest_framework.pagination import CursorPagination


class PostCursorPagination(CursorPagination):
    """게시글 무한 스크롤용 커서 페이지네이션."""

    page_size = 20
    ordering = "-created_at"
