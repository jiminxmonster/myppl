from django.utils import timezone
from django.utils.text import slugify
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework import generics, permissions, response, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOnly, IsAdminOrModerator
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from .models import MarketplaceCategory, MarketplaceItem, PurchaseRequest
from .serializers import (
    MarketplaceApprovalSerializer,
    MarketplaceCategorySerializer,
    MarketplaceItemSerializer,
    MarketplaceStatusSerializer,
    PurchaseRequestSerializer,
)


class MarketplaceListCreateView(generics.ListCreateAPIView):
    """중고장터 목록/등록 API."""

    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = MarketplaceItem.objects.select_related("author", "category", "product_category", "external_provider").all()
        user = self.request.user
        if not (
            user.is_authenticated
            and getattr(user, "operator_role", "") in {"moderator", "admin", "superadmin"}
        ):
            queryset = queryset.filter(approval_status=MarketplaceItem.APPROVAL_APPROVED)
        category_slug = self.request.query_params.get("category")
        placement = self.request.query_params.get("menu_placement")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug, category__is_visible=True)
        if placement in {MarketplaceItem.MENU_PLACEMENT_SALE, MarketplaceItem.MENU_PLACEMENT_USED}:
            queryset = queryset.filter(menu_placement=placement)
        queryset = queryset.exclude(category__menu_placement=MarketplaceCategory.MENU_PLACEMENT_HIDDEN)
        return queryset

    def perform_create(self, serializer):
        """판매자를 현재 로그인 사용자로 고정한다."""
        if (
            self.request.user.operator_role not in {"moderator", "admin", "superadmin"}
            and self.request.user.member_type != self.request.user.MEMBER_SELLER
        ):
            raise PermissionDenied("판매자 계정만 상품을 등록할 수 있습니다.")
        serializer.save(
            author=self.request.user,
            approval_status=MarketplaceItem.APPROVAL_PENDING,
            approval_note="",
            reviewed_by=None,
            reviewed_at=None,
        )


class MyMarketplaceListView(generics.ListAPIView):
    """현재 로그인한 판매자의 등록 상품 목록 API."""

    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return (
            MarketplaceItem.objects.select_related("author", "category", "product_category", "external_provider")
            .filter(author=self.request.user)
            .order_by("-created_at", "-id")
        )


class MarketplaceManageView(generics.RetrieveUpdateDestroyAPIView):
    """판매자 본인 상품 수정/삭제 API."""

    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_url_kwarg = "item_id"

    def get_queryset(self):
        return MarketplaceItem.objects.select_related("author", "category", "product_category", "external_provider")

    def get_object(self):
        item = super().get_object()
        if item.author != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("본인이 등록한 상품만 수정할 수 있습니다.")
        return item

    def perform_update(self, serializer):
        serializer.save(
            approval_status=MarketplaceItem.APPROVAL_PENDING,
            approval_note="",
            reviewed_by=None,
            reviewed_at=None,
        )


class MarketplaceDetailView(generics.RetrieveAPIView):
    """중고장터 상세 API."""

    queryset = MarketplaceItem.objects.select_related("author", "category", "product_category", "external_provider").all()
    serializer_class = MarketplaceItemSerializer
    permission_classes = [permissions.AllowAny]
    lookup_url_kwarg = "item_id"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        is_operator = request.user.is_authenticated and getattr(request.user, "operator_role", "") in {"moderator", "admin", "superadmin"}
        is_owner = request.user.is_authenticated and instance.author_id == request.user.id
        if instance.approval_status != MarketplaceItem.APPROVAL_APPROVED and not (is_operator or is_owner):
            raise PermissionDenied("검토 중인 판매글은 아직 공개되지 않았습니다.")
        MarketplaceItem.objects.filter(id=instance.id).update(view_count=instance.view_count + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class MarketplaceStatusUpdateView(APIView):
    """거래 상태 변경 API."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id, *args, **kwargs):
        """판매자 또는 관리자만 상태를 변경할 수 있다."""
        item = get_object_or_404(MarketplaceItem, id=item_id)
        if item.author != request.user and not request.user.is_staff:
            return response.Response({"detail": "상태 변경 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        serializer = MarketplaceStatusSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(MarketplaceItemSerializer(item).data, status=status.HTTP_200_OK)


class MarketplacePurchaseView(APIView):
    """구매 요청 API."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, item_id, *args, **kwargs):
        """동일 사용자의 중복 구매 요청을 막는다."""
        item = get_object_or_404(MarketplaceItem, id=item_id)
        serializer = PurchaseRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        purchase_request, created = PurchaseRequest.objects.get_or_create(
            item=item,
            buyer=request.user,
            defaults={"message": serializer.validated_data.get("message", "")},
        )
        if not created:
            return response.Response({"detail": "이미 구매 요청을 보냈습니다."}, status=status.HTTP_400_BAD_REQUEST)

        if item.author_id != request.user.id:
            create_notification(
                user=item.author,
                notification_type=Notification.TYPE_PURCHASE,
                title="구매 요청 알림",
                message=f"{request.user.nickname}님이 '{item.title}' 상품 구매를 요청했습니다.",
                target_url="/marketplace",
            )
        return response.Response(PurchaseRequestSerializer(purchase_request).data, status=status.HTTP_201_CREATED)


class MarketplaceCategoryListView(generics.ListAPIView):
    """중고장터 좌측 메뉴 카테고리 목록 API."""

    serializer_class = MarketplaceCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        queryset = MarketplaceCategory.objects.filter(is_visible=True).exclude(menu_placement=MarketplaceCategory.MENU_PLACEMENT_HIDDEN)
        placement = self.request.query_params.get("menu_placement")
        if placement in {MarketplaceCategory.MENU_PLACEMENT_SALE, MarketplaceCategory.MENU_PLACEMENT_USED}:
            queryset = queryset.filter(
                Q(menu_placement=placement) | Q(menu_placement=MarketplaceCategory.MENU_PLACEMENT_BOTH)
            )
        return queryset.order_by("sort_order", "id")


class AdminMarketplaceCategoryListCreateView(generics.ListCreateAPIView):
    """운영자용 중고장터 카테고리 목록/생성 API."""

    serializer_class = MarketplaceCategorySerializer
    permission_classes = [IsAdminOnly]
    pagination_class = None

    def get_queryset(self):
        return MarketplaceCategory.objects.all().order_by("sort_order", "id")

    def perform_create(self, serializer):
        base_slug = slugify(serializer.validated_data["name"], allow_unicode=True) or "market-category"
        slug = base_slug
        suffix = 2
        while MarketplaceCategory.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        serializer.save(slug=slug)


class AdminMarketplaceCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """운영자용 중고장터 카테고리 수정/삭제 API."""

    serializer_class = MarketplaceCategorySerializer
    permission_classes = [IsAdminOnly]
    queryset = MarketplaceCategory.objects.all()
    lookup_url_kwarg = "category_id"


class AdminMarketplaceCategoryReorderView(APIView):
    """운영자용 중고장터 카테고리 순서 변경 API."""

    permission_classes = [IsAdminOnly]

    def patch(self, request, *args, **kwargs):
        order_list = request.data.get("order", [])
        for index, category_id in enumerate(order_list):
            MarketplaceCategory.objects.filter(id=category_id).update(sort_order=index)
        return response.Response({"detail": "정렬 순서를 변경했습니다."}, status=status.HTTP_200_OK)


class AdminMarketplaceItemListView(generics.ListAPIView):
    """운영자용 판매상품 검토 목록 API."""

    serializer_class = MarketplaceItemSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        queryset = MarketplaceItem.objects.select_related("author", "category", "product_category", "external_provider", "reviewed_by")
        approval_status = self.request.query_params.get("approval_status")
        if approval_status:
            queryset = queryset.filter(approval_status=approval_status)
        return queryset.order_by("approval_status", "-created_at", "-id")


class AdminMarketplaceApprovalView(APIView):
    """운영자용 판매상품 승인/반려 API."""

    permission_classes = [IsAdminOrModerator]

    def patch(self, request, item_id, *args, **kwargs):
        item = get_object_or_404(MarketplaceItem, id=item_id)
        serializer = MarketplaceApprovalSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(reviewed_by=request.user, reviewed_at=timezone.now())

        if item.author_id != request.user.id:
            title = "판매상품 검토 결과"
            if serializer.validated_data.get("approval_status") == MarketplaceItem.APPROVAL_APPROVED:
                message = f"'{item.title}' 판매상품이 승인되어 상품리스트에 공개되었습니다."
            else:
                message = f"'{item.title}' 판매상품이 반려되었습니다. 수정 후 다시 등록해 주세요."
            create_notification(
                user=item.author,
                notification_type=Notification.TYPE_MESSAGE,
                title=title,
                message=message,
                target_url="/seller-products",
            )

        return response.Response(MarketplaceItemSerializer(item).data, status=status.HTTP_200_OK)
