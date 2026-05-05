from django.urls import path

from .views import PaymentListView, PaymentPrepareView, PaymentVerifyView

urlpatterns = [
    path("payments/prepare/", PaymentPrepareView.as_view(), name="payment_prepare"),
    path("payments/verify/", PaymentVerifyView.as_view(), name="payment_verify"),
    path("payments/", PaymentListView.as_view(), name="payment_list"),
]
