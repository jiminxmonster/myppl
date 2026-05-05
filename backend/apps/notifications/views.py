from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, response, status
from rest_framework.views import APIView

from .models import Notification, NotificationDelivery, NotificationPreference
from .serializers import NotificationDeliverySerializer, NotificationPreferenceSerializer, NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """내 알림 목록 API."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """현재 로그인 사용자의 알림만 반환한다."""
        return Notification.objects.filter(user=self.request.user)


class NotificationReadView(APIView):
    """알림 읽음 처리 API."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, notification_id, *args, **kwargs):
        """대상 알림을 읽음 상태로 전환한다."""
        notification = get_object_or_404(Notification, id=notification_id, user=request.user)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return response.Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


class NotificationPreferenceView(APIView):
    """내 알림 채널 설정 조회/수정 API."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        preference, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return response.Response(NotificationPreferenceSerializer(preference).data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        preference, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class NotificationDeliveryListView(generics.ListAPIView):
    """내 알림 채널 발송 이력 API."""

    serializer_class = NotificationDeliverySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = NotificationDelivery.objects.filter(user=self.request.user).select_related("notification")
        notification_id = self.request.query_params.get("notification_id", "").strip()
        channel = self.request.query_params.get("channel", "").strip()
        status_value = self.request.query_params.get("status", "").strip()

        if notification_id.isdigit():
            queryset = queryset.filter(notification_id=int(notification_id))
        if channel:
            queryset = queryset.filter(channel=channel)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset.order_by("-created_at", "-id")
