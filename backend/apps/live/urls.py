from django.urls import path
from . import views

urlpatterns = [
    # Public
    path("", views.LiveRoomListView.as_view(), name="live_list"),
    path("<int:pk>/", views.LiveRoomDetailView.as_view(), name="live_detail"),
    path("<int:pk>/messages/", views.LiveChatMessageListView.as_view(), name="live_messages"),

    # Auth
    path("<int:pk>/messages/create/", views.LiveChatMessageCreateView.as_view(), name="live_message_create"),

    # Admin / Seller
    path("admin/", views.AdminLiveRoomListCreateView.as_view(), name="admin_live_list_create"),
    path("admin/<int:pk>/", views.AdminLiveRoomDetailView.as_view(), name="admin_live_detail"),
    path("admin/<int:pk>/products/", views.AdminLiveRoomProductView.as_view(), name="admin_live_products"),
    path("<int:pk>/products/<int:product_id>/", views.AdminLiveRoomProductDeleteView.as_view(), name="admin_live_product_delete"),
    path("<int:pk>/messages/<int:message_id>/hide/", views.AdminHideChatMessageView.as_view(), name="admin_hide_message"),

    # Settings
    path("admin/settings/", views.LiveSettingsView.as_view(), name="live_settings"),
]
