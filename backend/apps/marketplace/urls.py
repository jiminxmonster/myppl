from django.urls import path

from .views import (
    AdminMarketplaceApprovalView,
    AdminMarketplaceCategoryDetailView,
    AdminMarketplaceCategoryListCreateView,
    AdminMarketplaceCategoryReorderView,
    AdminMarketplaceItemListView,
    MarketplaceCategoryListView,
    MarketplaceDetailView,
    MarketplaceListCreateView,
    MarketplaceManageView,
    MyMarketplaceListView,
    MarketplacePurchaseView,
    MarketplaceStatusUpdateView,
)

urlpatterns = [
    path("marketplace/", MarketplaceListCreateView.as_view(), name="marketplace_list_create"),
    path("marketplace/mine/", MyMarketplaceListView.as_view(), name="marketplace_my_list"),
    path("marketplace/<int:item_id>/", MarketplaceDetailView.as_view(), name="marketplace_detail"),
    path("marketplace/<int:item_id>/manage/", MarketplaceManageView.as_view(), name="marketplace_manage"),
    path("marketplace/<int:item_id>/status/", MarketplaceStatusUpdateView.as_view(), name="marketplace_status"),
    path("marketplace/<int:item_id>/purchase/", MarketplacePurchaseView.as_view(), name="marketplace_purchase"),
    path("marketplace-categories/", MarketplaceCategoryListView.as_view(), name="marketplace_category_list"),
    path("admin/marketplace-categories/", AdminMarketplaceCategoryListCreateView.as_view(), name="admin_marketplace_category_list_create"),
    path("admin/marketplace-categories/reorder/", AdminMarketplaceCategoryReorderView.as_view(), name="admin_marketplace_category_reorder"),
    path("admin/marketplace-categories/<int:category_id>/", AdminMarketplaceCategoryDetailView.as_view(), name="admin_marketplace_category_detail"),
    path("admin/marketplace-items/", AdminMarketplaceItemListView.as_view(), name="admin_marketplace_item_list"),
    path("admin/marketplace-items/<int:item_id>/approval/", AdminMarketplaceApprovalView.as_view(), name="admin_marketplace_item_approval"),
]
