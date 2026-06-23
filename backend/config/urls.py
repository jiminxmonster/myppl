"""API 전용 URL 라우터."""

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, Http404
from django.urls import include, path
from pathlib import Path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.boards.urls")),
    path("api/v1/", include("apps.catalog.urls")),
    path("api/v1/", include("apps.hotdeals.urls")),
    path("api/v1/", include("apps.marketplace.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/", include("apps.payments.urls")),
    path("api/v1/live/", include("apps.live.urls")),
]

def serve_media_file(request, file_path: str):
    """
    Cloud Run(DEBUG=False)에서도 업로드 미디어를 안전하게 제공한다.
    """
    media_root = Path(settings.MEDIA_ROOT).resolve()
    target_path = (media_root / file_path).resolve()

    if media_root not in target_path.parents and target_path != media_root:
        raise Http404("잘못된 경로입니다.")
    if not target_path.exists() or not target_path.is_file():
        raise Http404("파일이 존재하지 않습니다.")

    return FileResponse(target_path.open("rb"))


urlpatterns += [
    path("media/<path:file_path>", serve_media_file, name="serve_media_file"),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
