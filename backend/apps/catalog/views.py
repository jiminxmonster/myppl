import json

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, response, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminOrModerator
from apps.admin_logs.models import AdminLog
from apps.admin_logs.services import create_admin_log
from apps.marketplace.models import MarketplaceItem
from apps.marketplace.serializers import MarketplaceItemSerializer

from .connectors.coupang import (
    CoupangConfigurationError,
    CoupangConnector,
    CoupangFetchError,
)
from .import_normalizers import build_haystack, normalize_external_import_preview
from .models import (
    CategoryFilter,
    CategoryFilterOption,
    CategoryReferenceImage,
    HomeProductSectionConfig,
    HomeHeroSlide,
    SiteDisplaySetting,
    CategoryMapping,
    ExternalAttribute,
    ExternalCategory,
    ExternalProvider,
    FilterMapping,
    ProductAlertSubscription,
    ProductCategory,
    SellerOptionPreset,
)
from .serializers import (
    CategoryFilterSerializer,
    CategoryFilterOptionSerializer,
    CategoryReferenceImageSerializer,
    HomeProductSectionConfigSerializer,
    HomeHeroSlideSerializer,
    SiteDisplaySettingSerializer,
    CategoryMappingSerializer,
    ExternalAttributeSerializer,
    ExternalCategorySerializer,
    ExternalProviderSerializer,
    FilterMappingSerializer,
    ProductAlertSubscriptionSerializer,
    ProductAlertSubscriptionWriteSerializer,
    ProductCategorySerializer,
    SellerOptionPresetSerializer,
    SellerImportPreviewRequestSerializer,
)

def _coerce_payload(raw_payload):
    if not raw_payload:
        return {}
    try:
        return json.loads(raw_payload)
    except json.JSONDecodeError as error:
        raise ValidationError({"raw_payload": f"JSON 형식이 올바르지 않습니다. {error.msg}"})


def _resolve_import_payload(provider, reference, raw_payload):
    if raw_payload:
        return _coerce_payload(raw_payload)
    if provider and provider.code == "coupang" and reference:
        try:
            connector = CoupangConnector.from_settings(provider)
            return connector.fetch_product_payload(reference)
        except CoupangConfigurationError as error:
            raise ValidationError({"provider": str(error)}) from error
        except CoupangFetchError as error:
            raise ValidationError({"external_reference": str(error)}) from error
    return {}


def _infer_product_category(category_id, reference, payload):
    queryset = ProductCategory.objects.filter(is_active=True, is_visible=True).prefetch_related("filters__options")
    if category_id:
        return get_object_or_404(queryset, id=category_id)

    haystack = build_haystack(reference, payload)
    categories = list(queryset.order_by("sort_order", "id"))
    for category in categories:
        if category.name.lower() in haystack:
            return category
    return categories[0] if categories else None


def _collect_option_snapshot(category, reference, payload):
    if not category:
        return {}

    haystack = build_haystack(reference, payload)
    snapshot = {}
    filters = category.filters.filter(is_visible=True).prefetch_related("options").order_by("sort_order", "id")
    for filter_item in filters:
        matched_options = []
        for option in filter_item.options.filter(is_active=True).order_by("sort_order", "id"):
            candidates = [option.label.lower()]
            if option.normalized_value:
                candidates.append(option.normalized_value.lower())
            if any(candidate and candidate in haystack for candidate in candidates):
                matched_options.append(option.label)

        if filter_item.filter_type == CategoryFilter.TYPE_CHECKBOX:
            snapshot[filter_item.slug] = matched_options
        elif filter_item.filter_type == CategoryFilter.TYPE_SINGLE:
            snapshot[filter_item.slug] = matched_options[0] if matched_options else ""
        else:
            snapshot[filter_item.slug] = ""

    return snapshot

def _collect_category_ids(category):
    if not category:
        return set()

    related_ids = {category.id}
    if category.parent_id:
        related_ids.add(category.parent_id)
    child_ids = list(category.children.filter(is_active=True, is_visible=True).values_list("id", flat=True))
    related_ids.update(child_ids)
    return related_ids


def _as_value_list(value):
    if value in (None, "", [], {}):
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if f"{item}".strip()]
    return [str(value).strip()]


def _has_matching_filter_value(expected, actual):
    expected_values = {value.lower() for value in _as_value_list(expected)}
    if not expected_values:
        return True

    actual_values = {value.lower() for value in _as_value_list(actual)}
    if not actual_values:
        return False

    return bool(expected_values & actual_values)


def _keyword_matches(subscription, item):
    keywords = [keyword.lower().strip() for keyword in subscription.keywords if keyword and keyword.strip()]
    if not keywords:
        return True

    haystack = " ".join(
        [
            item.title or "",
            item.description or "",
            item.category.name if item.category else "",
            item.product_category.name if item.product_category else "",
        ]
    ).lower()

    return any(keyword in haystack for keyword in keywords)


def _build_marketplace_match_results(subscription, queryset):
    category_ids = _collect_category_ids(subscription.category)
    stored_filters = subscription.filters or {}
    public_filters = {key: value for key, value in stored_filters.items() if not key.startswith("__")}
    matches = []

    for item in queryset:
        if item.product_category_id and category_ids and item.product_category_id not in category_ids:
            continue
        if not _keyword_matches(subscription, item):
            continue

        option_snapshot = item.option_snapshot or {}
        matched_filter_count = 0
        filter_failed = False
        for filter_key, expected_value in public_filters.items():
            if not _has_matching_filter_value(expected_value, option_snapshot.get(filter_key)):
                filter_failed = True
                break
            if _as_value_list(expected_value):
                matched_filter_count += 1

        if filter_failed:
            continue

        score = matched_filter_count * 10 + min(item.view_count, 999)
        matches.append((score, item))

    matches.sort(key=lambda pair: (pair[0], pair[1].view_count, pair[1].created_at), reverse=True)
    return [item for _, item in matches]


class AdminProviderListCreateView(generics.ListCreateAPIView):
    serializer_class = ExternalProviderSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        return ExternalProvider.objects.all()

    def perform_create(self, serializer):
        provider = serializer.save()
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_BOARD_CREATE,
            target_id=provider.id,
            detail={"provider": provider.name, "type": "external_provider"},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )


class ExternalProviderListView(generics.ListAPIView):
    serializer_class = ExternalProviderSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return ExternalProvider.objects.filter(is_active=True).order_by("name", "id")


class AdminProviderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExternalProviderSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = ExternalProvider.objects.all()
    lookup_url_kwarg = "provider_id"


class AdminProductCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        return ProductCategory.objects.prefetch_related("filters__options").all()

    def perform_create(self, serializer):
        category = serializer.save(created_by=self.request.user)
        create_admin_log(
            admin=self.request.user,
            action=AdminLog.ACTION_BOARD_CREATE,
            target_id=category.id,
            detail={"category": category.name, "type": "product_category"},
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )


class AdminProductCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAdminOrModerator]
    queryset = ProductCategory.objects.prefetch_related("filters__options").all()
    lookup_url_kwarg = "category_id"


class AdminCategoryFilterListCreateView(generics.ListCreateAPIView):
    serializer_class = CategoryFilterSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        queryset = CategoryFilter.objects.prefetch_related("options").select_related("category")
        category_id = self.request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset.order_by("category__sort_order", "sort_order", "id")


class AdminCategoryFilterDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategoryFilterSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = CategoryFilter.objects.prefetch_related("options").select_related("category")
    lookup_url_kwarg = "filter_id"


class AdminCategoryFilterOptionListCreateView(generics.ListCreateAPIView):
    serializer_class = CategoryFilterOptionSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        queryset = CategoryFilterOption.objects.select_related("filter", "filter__category")
        filter_id = self.request.query_params.get("filter_id")
        if filter_id:
            queryset = queryset.filter(filter_id=filter_id)
        return queryset.order_by("filter__category__sort_order", "filter__sort_order", "sort_order", "id")


class AdminCategoryFilterOptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategoryFilterOptionSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = CategoryFilterOption.objects.select_related("filter", "filter__category")
    lookup_url_kwarg = "option_id"


class AdminCategoryReferenceImageListCreateView(generics.ListCreateAPIView):
    serializer_class = CategoryReferenceImageSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        queryset = CategoryReferenceImage.objects.select_related("category")
        category_id = self.request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset.order_by("category__sort_order", "sort_order", "id")


class AdminCategoryReferenceImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategoryReferenceImageSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = CategoryReferenceImage.objects.select_related("category")
    lookup_url_kwarg = "reference_image_id"


class HomeProductSectionConfigListView(generics.ListAPIView):
    serializer_class = HomeProductSectionConfigSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return HomeProductSectionConfig.objects.filter(is_active=True).order_by("sort_order", "id")


class SiteDisplaySettingView(APIView):
    """공개 화면 노출 설정 API."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return response.Response(SiteDisplaySettingSerializer(SiteDisplaySetting.get_solo()).data, status=status.HTTP_200_OK)


class AdminSiteDisplaySettingView(APIView):
    """운영자 화면 노출 설정 API."""

    permission_classes = [IsAdminOrModerator]

    def get(self, request, *args, **kwargs):
        return response.Response(SiteDisplaySettingSerializer(SiteDisplaySetting.get_solo()).data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        setting = SiteDisplaySetting.get_solo()
        serializer = SiteDisplaySettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class AdminHomeProductSectionConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = HomeProductSectionConfigSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        return HomeProductSectionConfig.objects.all().order_by("sort_order", "id")


class AdminHomeProductSectionConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HomeProductSectionConfigSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = HomeProductSectionConfig.objects.all().order_by("sort_order", "id")
    lookup_url_kwarg = "section_id"


class HomeHeroSlideListView(generics.ListAPIView):
    serializer_class = HomeHeroSlideSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return HomeHeroSlide.objects.filter(is_active=True).order_by("sort_order", "id")


class AdminHomeHeroSlideListCreateView(generics.ListCreateAPIView):
    serializer_class = HomeHeroSlideSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return HomeHeroSlide.objects.all().order_by("sort_order", "id")


class AdminHomeHeroSlideDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HomeHeroSlideSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = HomeHeroSlide.objects.all().order_by("sort_order", "id")
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_url_kwarg = "slide_id"


class AdminHomeHeroSlideReorderView(APIView):
    """메인 전면광고 슬라이드 순서 변경 API."""

    permission_classes = [IsAdminOrModerator]

    def patch(self, request, *args, **kwargs):
        order_raw = request.data.get("order", [])
        if not isinstance(order_raw, list):
            raise ValidationError({"order": "order는 ID 배열이어야 합니다."})

        try:
            order_list = [int(item) for item in order_raw]
        except (TypeError, ValueError):
            raise ValidationError({"order": "order 안의 값은 정수여야 합니다."})

        if len(set(order_list)) != len(order_list):
            raise ValidationError({"order": "order는 중복되지 않은 ID로 구성되어야 합니다."})

        existing_ids = set(HomeHeroSlide.objects.filter(id__in=order_list).values_list("id", flat=True))
        missing_ids = [item_id for item_id in order_list if item_id not in existing_ids]
        if missing_ids:
            raise ValidationError({"order": f"존재하지 않는 슬라이드가 있습니다: {missing_ids}"})

        for index, slide_id in enumerate(order_list):
            HomeHeroSlide.objects.filter(id=slide_id).update(sort_order=index)

        return response.Response({"detail": "전면광고 슬라이드 정렬 순서를 변경했습니다."}, status=status.HTTP_200_OK)


class AdminExternalCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = ExternalCategorySerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        queryset = ExternalCategory.objects.select_related("provider")
        provider_id = self.request.query_params.get("provider_id")
        if provider_id:
            queryset = queryset.filter(provider_id=provider_id)
        return queryset


class AdminExternalAttributeListCreateView(generics.ListCreateAPIView):
    serializer_class = ExternalAttributeSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        queryset = ExternalAttribute.objects.select_related("category", "category__provider")
        category_id = self.request.query_params.get("category_id")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset


class AdminCategoryMappingListCreateView(generics.ListCreateAPIView):
    serializer_class = CategoryMappingSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        return CategoryMapping.objects.select_related("internal_category", "external_category", "external_category__provider")

    def perform_create(self, serializer):
        status_value = serializer.validated_data.get("status", CategoryMapping.STATUS_PENDING)
        approved_by = self.request.user if status_value == CategoryMapping.STATUS_APPROVED else None
        approved_at = timezone.now() if status_value == CategoryMapping.STATUS_APPROVED else None
        serializer.save(approved_by=approved_by, approved_at=approved_at)


class AdminCategoryMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategoryMappingSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = CategoryMapping.objects.select_related("internal_category", "external_category", "external_category__provider")
    lookup_url_kwarg = "mapping_id"

    def perform_update(self, serializer):
        status_value = serializer.validated_data.get("status")
        extra = {}
        if status_value == CategoryMapping.STATUS_APPROVED:
            extra["approved_by"] = self.request.user
            extra["approved_at"] = timezone.now()
        serializer.save(**extra)


class AdminFilterMappingListCreateView(generics.ListCreateAPIView):
    serializer_class = FilterMappingSerializer
    permission_classes = [IsAdminOrModerator]
    pagination_class = None

    def get_queryset(self):
        return FilterMapping.objects.select_related(
            "internal_filter",
            "internal_filter__category",
            "external_attribute",
            "external_attribute__category",
            "external_attribute__category__provider",
        )

    def perform_create(self, serializer):
        status_value = serializer.validated_data.get("status", FilterMapping.STATUS_PENDING)
        approved_by = self.request.user if status_value == FilterMapping.STATUS_APPROVED else None
        approved_at = timezone.now() if status_value == FilterMapping.STATUS_APPROVED else None
        serializer.save(approved_by=approved_by, approved_at=approved_at)


class AdminFilterMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FilterMappingSerializer
    permission_classes = [IsAdminOrModerator]
    queryset = FilterMapping.objects.select_related(
        "internal_filter",
        "internal_filter__category",
        "external_attribute",
        "external_attribute__category",
        "external_attribute__category__provider",
    )
    lookup_url_kwarg = "mapping_id"

    def perform_update(self, serializer):
        status_value = serializer.validated_data.get("status")
        extra = {}
        if status_value == FilterMapping.STATUS_APPROVED:
            extra["approved_by"] = self.request.user
            extra["approved_at"] = timezone.now()
        serializer.save(**extra)


class ProductCategoryListView(generics.ListAPIView):
    serializer_class = ProductCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            ProductCategory.objects.filter(is_active=True, is_visible=True)
            .prefetch_related("filters__options", "children", "reference_images")
            .order_by("sort_order", "id")
        )


class ProductAlertSubscriptionListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return ProductAlertSubscription.objects.filter(user=self.request.user).select_related("category").prefetch_related("channels").order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductAlertSubscriptionWriteSerializer
        return ProductAlertSubscriptionSerializer

    def list(self, request, *args, **kwargs):
        serializer = ProductAlertSubscriptionSerializer(self.get_queryset(), many=True)
        return response.Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        if (
            request.user.operator_role not in {"moderator", "admin", "superadmin"}
            and request.user.member_type != request.user.MEMBER_BUYER
        ):
            return response.Response({"detail": "구매자 계정만 원하는상품을 저장할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProductAlertSubscriptionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save(user=request.user)
        return response.Response(ProductAlertSubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)


class ProductAlertSubscriptionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, subscription_id, *args, **kwargs):
        subscription = get_object_or_404(ProductAlertSubscription, id=subscription_id, user=request.user)
        serializer = ProductAlertSubscriptionWriteSerializer(subscription, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(ProductAlertSubscriptionSerializer(subscription).data, status=status.HTTP_200_OK)

    def delete(self, request, subscription_id, *args, **kwargs):
        subscription = get_object_or_404(ProductAlertSubscription, id=subscription_id, user=request.user)
        subscription.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)


class ProductAlertSubscriptionMatchListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        subscriptions = list(
            ProductAlertSubscription.objects.filter(user=request.user)
            .select_related("category", "category__parent")
            .prefetch_related("category__children")
            .order_by("-created_at", "-id")
        )
        marketplace_items = list(
            MarketplaceItem.objects.select_related("author", "category", "product_category", "external_provider")
            .filter(approval_status=MarketplaceItem.APPROVAL_APPROVED)
            .order_by("-view_count", "-created_at", "-id")
        )

        payload = []
        for subscription in subscriptions:
            matches = _build_marketplace_match_results(subscription, marketplace_items)
            payload.append(
                {
                    "subscription_id": subscription.id,
                    "match_count": len(matches),
                    "items": MarketplaceItemSerializer(matches[:6], many=True).data,
                }
            )

        return response.Response(payload, status=status.HTTP_200_OK)


class SellerOptionPresetListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SellerOptionPresetSerializer
    pagination_class = None

    def get_queryset(self):
        return SellerOptionPreset.objects.filter(user=self.request.user).select_related("product_category").order_by("name", "-updated_at", "-id")

    def _ensure_seller(self):
        if (
            self.request.user.operator_role not in {"moderator", "admin", "superadmin"}
            and self.request.user.member_type != self.request.user.MEMBER_SELLER
        ):
            raise PermissionDenied("판매자 계정만 옵션 프리셋을 저장할 수 있습니다.")

    def list(self, request, *args, **kwargs):
        self._ensure_seller()
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return response.Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        self._ensure_seller()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        preset = serializer.save(user=request.user)
        return response.Response(self.get_serializer(preset).data, status=status.HTTP_201_CREATED)


class SellerOptionPresetDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SellerOptionPresetSerializer
    lookup_url_kwarg = "preset_id"

    def get_queryset(self):
        return SellerOptionPreset.objects.filter(user=self.request.user).select_related("product_category")


class SellerImportPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if (
            request.user.operator_role not in {"moderator", "admin", "superadmin"}
            and request.user.member_type != request.user.MEMBER_SELLER
        ):
            raise PermissionDenied("판매자 계정만 외부 상품을 불러올 수 있습니다.")

        serializer = SellerImportPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = None
        provider_id = serializer.validated_data.get("provider")
        if provider_id:
            provider = get_object_or_404(ExternalProvider.objects.filter(is_active=True), id=provider_id)

        reference = serializer.validated_data.get("external_reference", "").strip()
        raw_payload = serializer.validated_data.get("raw_payload", "").strip()
        payload = _resolve_import_payload(provider, reference, raw_payload)
        category = _infer_product_category(serializer.validated_data.get("product_category"), reference, payload)
        preview = normalize_external_import_preview(
            provider,
            category,
            reference,
            payload,
            _collect_option_snapshot(category, reference, payload),
        )
        return response.Response(preview, status=status.HTTP_200_OK)
