from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .admin_views import (
    AdminDashboardView,
    AdminIPBanDetailView,
    AdminIPBanListCreateView,
    AdminLogListView,
    AdminMemberDetailView,
    AdminMemberGradeView,
    AdminMemberListView,
    AdminMemberPointsView,
    AdminMemberSuspendView,
    AdminOperatorRoleView,
    BootstrapSpecsExportView,
)
from .views import LoginView, LogoutView, MeView, MyPageSummaryView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("mypage/", MyPageSummaryView.as_view(), name="mypage"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="admin_dashboard"),
    path("admin/members/", AdminMemberListView.as_view(), name="admin_member_list"),
    path("admin/members/<int:user_id>/", AdminMemberDetailView.as_view(), name="admin_member_detail"),
    path("admin/members/<int:user_id>/suspend/", AdminMemberSuspendView.as_view(), name="admin_member_suspend"),
    path("admin/members/<int:user_id>/grade/", AdminMemberGradeView.as_view(), name="admin_member_grade"),
    path("admin/members/<int:user_id>/points/", AdminMemberPointsView.as_view(), name="admin_member_points"),
    path("admin/members/<int:user_id>/operator-role/", AdminOperatorRoleView.as_view(), name="admin_member_operator_role"),
    path("admin/ip-ban/", AdminIPBanListCreateView.as_view(), name="admin_ip_ban_list_create"),
    path("admin/ip-ban/<int:ban_id>/", AdminIPBanDetailView.as_view(), name="admin_ip_ban_detail"),
    path("admin/logs/", AdminLogListView.as_view(), name="admin_log_list"),
    path("admin/bootstrap-specs/", BootstrapSpecsExportView.as_view(), name="admin_bootstrap_specs"),
]
