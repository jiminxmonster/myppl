from django.utils.text import slugify
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, response, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOnly

from .models import Hotdeal, HotdealCategory
from .serializers import HotdealCategorySerializer, HotdealSerializer


class HotdealListCreateView(generics.ListCreateAPIView):
    """핫딜 목록/등록 API."""

    serializer_class = HotdealSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Hotdeal.objects.select_related("author", "category").all()
        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug, category__is_visible=True)
        return queryset

    def perform_create(self, serializer):
        """작성자를 현재 로그인 사용자로 고정한다."""
        if self.request.user.operator_role not in {"moderator", "admin", "superadmin"}:
            raise PermissionDenied("운영자만 핫딜을 등록할 수 있습니다.")
        serializer.save(author=self.request.user)


class HotdealDetailView(generics.RetrieveAPIView):
    """핫딜 상세 API."""

    queryset = Hotdeal.objects.select_related("author", "category").all()
    serializer_class = HotdealSerializer
    permission_classes = [permissions.AllowAny]
    lookup_url_kwarg = "hotdeal_id"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Hotdeal.objects.filter(id=instance.id).update(view_count=instance.view_count + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class HotdealExpireView(APIView):
    """핫딜 만료 처리 API."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, hotdeal_id, *args, **kwargs):
        """작성자 또는 관리자만 핫딜을 만료 처리할 수 있다."""
        hotdeal = get_object_or_404(Hotdeal, id=hotdeal_id)
        if hotdeal.author != request.user and not request.user.is_staff:
            return response.Response({"detail": "만료 처리 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        hotdeal.status = Hotdeal.STATUS_EXPIRED
        hotdeal.save(update_fields=["status", "updated_at"])
        return response.Response(HotdealSerializer(hotdeal).data, status=status.HTTP_200_OK)


class HotdealCategoryListView(generics.ListAPIView):
    """핫딜 좌측 메뉴 카테고리 목록 API."""

    serializer_class = HotdealCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return HotdealCategory.objects.filter(is_visible=True).order_by("sort_order", "id")


class AdminHotdealCategoryListCreateView(generics.ListCreateAPIView):
    """운영자용 핫딜 카테고리 목록/생성 API."""

    serializer_class = HotdealCategorySerializer
    permission_classes = [IsAdminOnly]
    pagination_class = None

    def get_queryset(self):
        return HotdealCategory.objects.all().order_by("sort_order", "id")

    def perform_create(self, serializer):
        base_slug = slugify(serializer.validated_data["name"], allow_unicode=True) or "hotdeal-category"
        slug = base_slug
        suffix = 2
        while HotdealCategory.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        serializer.save(slug=slug)


class AdminHotdealCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """운영자용 핫딜 카테고리 수정/삭제 API."""

    serializer_class = HotdealCategorySerializer
    permission_classes = [IsAdminOnly]
    queryset = HotdealCategory.objects.all()
    lookup_url_kwarg = "category_id"


class AdminHotdealCategoryReorderView(APIView):
    """운영자용 핫딜 카테고리 순서 변경 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, *args, **kwargs):
        order_list = request.data.get("order", [])
        for index, category_id in enumerate(order_list):
            HotdealCategory.objects.filter(id=category_id).update(sort_order=index)
        return response.Response({"detail": "정렬 순서를 변경했습니다."}, status=status.HTTP_200_OK)
