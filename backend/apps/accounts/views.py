from django.db.models import Count, Sum
from rest_framework import generics, permissions, response, status
from rest_framework.views import APIView

from apps.boards.models import Post
from apps.notifications.models import Notification
from apps.payments.models import Payment

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """회원가입 API."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        """회원 생성 후 사용자 정보를 JSON으로 반환한다."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return response.Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """JWT 로그인 API."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """로그인 성공 시 access/refresh 토큰과 사용자 정보를 반환한다."""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return response.Response(
            {
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data["refresh"],
                "user": UserSerializer(serializer.validated_data["user"]).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """클라이언트 토큰 제거용 로그아웃 API."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """서버 세션은 사용하지 않으므로 안내 메시지만 반환한다."""
        return response.Response({"detail": "로그아웃 되었습니다."}, status=status.HTTP_200_OK)


class MeView(APIView):
    """내 정보 조회/수정 API."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """현재 인증된 회원 정보를 반환한다."""
        return response.Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        """허용된 회원 프로필 정보를 부분 수정한다."""
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data, status=status.HTTP_200_OK)


class MyPageSummaryView(APIView):
    """마이페이지 요약 정보 API."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """회원 활동, 결제, 알림 현황을 한 번에 반환한다."""
        user = request.user
        posts = Post.objects.filter(author=user).select_related("board")[:5]
        post_totals = Post.objects.filter(author=user).aggregate(
            total_posts=Count("id"),
            total_views=Sum("views"),
            total_likes=Sum("likes"),
        )
        payment_totals = Payment.objects.filter(buyer=user).aggregate(total_payments=Count("id"))
        unread_notifications = Notification.objects.filter(user=user, is_read=False).count()

        return response.Response(
            {
                "user": UserSerializer(user).data,
                "stats": {
                    "total_posts": post_totals["total_posts"] or 0,
                    "total_views": post_totals["total_views"] or 0,
                    "total_likes": post_totals["total_likes"] or 0,
                    "total_payments": payment_totals["total_payments"] or 0,
                    "unread_notifications": unread_notifications,
                },
                "recent_posts": [
                    {
                        "id": post.id,
                        "title": post.title,
                        "board_name": post.board.name,
                        "board_slug": post.board.slug,
                        "views": post.views,
                        "likes": post.likes,
                        "created_at": post.created_at,
                    }
                    for post in posts
                ],
            },
            status=status.HTTP_200_OK,
        )
