from django.urls import path

from .views import NotificationDeliveryListView, NotificationListView, NotificationPreferenceView, NotificationReadView

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification_list"),
    path("notifications/<int:notification_id>/read/", NotificationReadView.as_view(), name="notification_read"),
    path("notifications/preferences/", NotificationPreferenceView.as_view(), name="notification_preference"),
    path("notifications/deliveries/", NotificationDeliveryListView.as_view(), name="notification_delivery_list"),
]
