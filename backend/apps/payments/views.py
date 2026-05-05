from django.shortcuts import get_object_or_404
from rest_framework import permissions, response, status
from rest_framework.views import APIView

from .models import Payment
from .serializers import PaymentPrepareSerializer, PaymentSerializer, PaymentVerifySerializer


class PaymentPrepareView(APIView):
    """포트원 호출 전 주문 생성 API."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """클라이언트 결제창에 필요한 주문 정보를 생성한다."""
        serializer = PaymentPrepareSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return response.Response(
            {
                "payment": PaymentSerializer(payment).data,
                "portone": {
                    "merchant_uid": payment.merchant_uid,
                    "amount": str(payment.amount),
                    "buyer_name": payment.metadata.get("buyer_name", ""),
                    "buyer_email": payment.metadata.get("buyer_email", ""),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentVerifyView(APIView):
    """결제 완료 상태 반영 API."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """MVP 단계에서는 클라이언트 전달값으로 결제 상태를 반영한다."""
        serializer = PaymentVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = get_object_or_404(Payment, merchant_uid=serializer.validated_data["merchant_uid"], buyer=request.user)
        payment.payment_key = serializer.validated_data["payment_key"]
        payment.status = serializer.validated_data["status"]
        payment.save(update_fields=["payment_key", "status", "updated_at"])
        return response.Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)


class PaymentListView(APIView):
    """내 결제 목록 API."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """현재 로그인 사용자의 결제 이력을 반환한다."""
        payments = Payment.objects.filter(buyer=request.user)
        return response.Response(PaymentSerializer(payments, many=True).data, status=status.HTTP_200_OK)
