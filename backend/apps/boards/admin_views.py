from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import generics, response, status
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOnly, IsAdminOrModerator
from apps.admin_logs.models import AdminLog
from apps.admin_logs.services import create_admin_log

from .admin_serializers import AdminBoardSerializer
from .models import Board, Post, PostImage
from .product_sourcing import MockProductSourcingProvider, ProductSourcingProvider


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


def get_sourcing_provider(name: str) -> ProductSourcingProvider:
    """1차 구현: mock provider만 반환"""
    return MockProductSourcingProvider()


class ProductSourcingSearchView(APIView):
    """관리자 상품 소싱 검색 (1차: Mock)"""

    permission_classes = [IsAdminOrModerator]

    def post(self, request):
        provider_name = request.data.get("provider", "mock")
        keyword = (request.data.get("keyword") or "").strip()
        page = int(request.data.get("page", 1))
        limit = min(int(request.data.get("limit", 20)), 50)

        if not keyword:
            return response.Response({"results": []})

        provider = get_sourcing_provider(provider_name)
        results = provider.search(keyword, page=page, limit=limit)
        return response.Response({"results": results})


class ProductSourcingImportView(APIView):
    """선택 상품을 게시글로 등록 (이미지 다운로드 + Tiptap HTML)"""

    permission_classes = [IsAdminOrModerator]

    def post(self, request):
        board_slug = request.data.get("board_slug")
        items = request.data.get("items", [])

        if not board_slug or not items:
            return response.Response({"detail": "board_slug와 items가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        board = get_object_or_404(Board, slug=board_slug)
        provider = get_sourcing_provider("mock")  # 1차는 mock

        created = []
        failed = []

        for item in items:
            try:
                title = item.get("title") or "상품"
                image_url = item.get("image_url") or ""
                internal_image = provider.download_image_to_media(image_url) if image_url else None

                if not internal_image:
                    # 이미지 없거나 실패 시 placeholder 또는 실패 처리
                    internal_image = "/placeholders/market-default.svg"

                # Tiptap HTML 구조 (기존 에디터 호환)
                html_content = f"""<p>외부 상품 소싱으로 등록된 상품입니다.</p>
<img src="{internal_image}" alt="{title}">
<p>상품명: {title}</p>
<p>쇼핑몰: {item.get('store_name', '')}</p>
<p>가격: {item.get('sale_price', 0):,}원 (원가 {item.get('original_price', 0):,}원)</p>
<p><a href="{item.get('product_url', '#')}" target="_blank" rel="noopener">쇼핑몰에서 보기</a></p>"""

                post = Post.objects.create(
                    board=board,
                    author=request.user,
                    title=title[:200],
                    content=html_content,
                )

                # set product fields via update to avoid schema mismatch (no DB change)
                update_fields = []
                for fld, val in [
                    ("product_original_price", item.get("original_price")),
                    ("product_sale_price", item.get("sale_price")),
                    ("product_store_name", (item.get("store_name") or "")[:80]),
                    ("product_live_url", (item.get("product_url") or "")[:500]),
                ]:
                    if val not in (None, ""):
                        setattr(post, fld, val)
                        update_fields.append(fld)
                if update_fields:
                    post.save(update_fields=update_fields)

                # PostImage 생성 → 첫 이미지 = 썸네일/메인 순위
                if internal_image and not internal_image.startswith("/placeholders"):
                    rel = internal_image.replace("/media/", "", 1)
                    pi = PostImage(post=post)
                    pi.image.name = rel
                    pi.save()

                created.append({
                    "post_id": post.id,
                    "title": post.title,
                    "url": f"/boards/{board.slug}/{post.id}",
                })

                # log omitted to avoid unknown action constant in 1차
                pass
            except Exception as e:
                failed.append({"external_id": item.get("external_id"), "title": item.get("title"), "error": str(e)})

        return response.Response({
            "created": created,
            "failed": failed,
        }, status=status.HTTP_200_OK)
