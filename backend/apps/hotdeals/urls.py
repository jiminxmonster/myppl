from django.urls import path

from .views import (
    AdminHotdealCategoryDetailView,
    AdminHotdealCategoryListCreateView,
    AdminHotdealCategoryReorderView,
    HotdealCategoryListView,
    HotdealDetailView,
    HotdealExpireView,
    HotdealListCreateView,
)

urlpatterns = [
    path("hotdeals/", HotdealListCreateView.as_view(), name="hotdeal_list_create"),
    path("hotdeals/<int:hotdeal_id>/", HotdealDetailView.as_view(), name="hotdeal_detail"),
    path("hotdeals/<int:hotdeal_id>/expire/", HotdealExpireView.as_view(), name="hotdeal_expire"),
    path("hotdeal-categories/", HotdealCategoryListView.as_view(), name="hotdeal_category_list"),
    path("admin/hotdeal-categories/", AdminHotdealCategoryListCreateView.as_view(), name="admin_hotdeal_category_list_create"),
    path("admin/hotdeal-categories/reorder/", AdminHotdealCategoryReorderView.as_view(), name="admin_hotdeal_category_reorder"),
    path("admin/hotdeal-categories/<int:category_id>/", AdminHotdealCategoryDetailView.as_view(), name="admin_hotdeal_category_detail"),
]
