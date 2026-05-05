"""공통 Django 설정."""

from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parents[2]

# 개발/운영 환경에서 공통으로 사용하는 핵심 보안 설정이다.
SECRET_KEY = config("SECRET_KEY", default="unsafe-dev-secret-key")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="127.0.0.1,localhost,backend", cast=Csv())

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "mptt",
    "channels",
    "storages",
    "apps.admin_logs",
    "apps.accounts",
    "apps.boards",
    "apps.catalog",
    "apps.hotdeals",
    "apps.marketplace",
    "apps.notifications",
    "apps.payments",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "middleware.ip_ban.IPBanMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="community_db"),
        "USER": config("DB_USER", default="admin"),
        "PASSWORD": config("DB_PASSWORD", default="admin"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = config("TIME_ZONE", default="Asia/Seoul")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

# 로컬 프론트엔드와의 통신을 허용하는 기본 CORS 설정이다.
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3100,http://127.0.0.1:3100,http://localhost:8080,http://127.0.0.1:8080",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.boards.pagination.PostCursorPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_BEAT_SCHEDULE = {
    "release-expired-suspensions-every-10-minutes": {
        "task": "apps.accounts.tasks.release_expired_suspensions",
        "schedule": 600.0,
    },
    "cleanup-expired-ip-bans-hourly": {
        "task": "apps.accounts.tasks.cleanup_expired_ip_bans",
        "schedule": 3600.0,
    },
}

# 개발 환경에서는 로컬 파일 저장소를, 운영 환경에서는 S3 호환 스토리지를 사용할 수 있게 분기한다.
USE_S3_STORAGE = config("USE_S3_STORAGE", default=False, cast=bool)
USE_GCS_STORAGE = config("USE_GCS_STORAGE", default=False, cast=bool)
AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="ewr1")
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False
GS_BUCKET_NAME = config("GS_BUCKET_NAME", default="")
GS_PROJECT_ID = config("GS_PROJECT_ID", default="")
GS_LOCATION = config("GS_LOCATION", default="")
GS_DEFAULT_ACL = None
GS_QUERYSTRING_AUTH = config("GS_QUERYSTRING_AUTH", default=False, cast=bool)
GS_FILE_OVERWRITE = config("GS_FILE_OVERWRITE", default=False, cast=bool)
GS_CUSTOM_ENDPOINT = config("GS_CUSTOM_ENDPOINT", default="")

# 쿠팡 판매자 Open API 실연동 설정이다.
COUPANG_ACCESS_KEY = config("COUPANG_ACCESS_KEY", default="")
COUPANG_SECRET_KEY = config("COUPANG_SECRET_KEY", default="")
COUPANG_VENDOR_ID = config("COUPANG_VENDOR_ID", default="")
COUPANG_BASE_URL = config("COUPANG_BASE_URL", default="https://api-gateway.coupang.com")

# 알림 채널 연동 설정(이메일/카카오/SMS)
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="")
NOTIFICATION_EMAIL_FROM = config("NOTIFICATION_EMAIL_FROM", default="")
NOTIFICATION_KAKAO_WEBHOOK_URL = config("NOTIFICATION_KAKAO_WEBHOOK_URL", default="")
NOTIFICATION_SMS_WEBHOOK_URL = config("NOTIFICATION_SMS_WEBHOOK_URL", default="")
NOTIFICATION_DELIVERY_TIMEOUT = config("NOTIFICATION_DELIVERY_TIMEOUT", default=8, cast=int)

if USE_GCS_STORAGE and GS_BUCKET_NAME:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
            "OPTIONS": {
                "bucket_name": GS_BUCKET_NAME,
                "project_id": GS_PROJECT_ID or None,
                "location": GS_LOCATION or None,
                "default_acl": GS_DEFAULT_ACL,
                "querystring_auth": GS_QUERYSTRING_AUTH,
                "file_overwrite": GS_FILE_OVERWRITE,
            },
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    if GS_CUSTOM_ENDPOINT:
        MEDIA_URL = f"{GS_CUSTOM_ENDPOINT.rstrip('/')}/{GS_BUCKET_NAME}/"
    else:
        MEDIA_URL = f"https://storage.googleapis.com/{GS_BUCKET_NAME}/"
elif USE_S3_STORAGE and AWS_STORAGE_BUCKET_NAME and AWS_S3_ENDPOINT_URL:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "access_key": AWS_ACCESS_KEY_ID,
                "secret_key": AWS_SECRET_ACCESS_KEY,
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "endpoint_url": AWS_S3_ENDPOINT_URL,
                "region_name": AWS_S3_REGION_NAME,
                "default_acl": AWS_DEFAULT_ACL,
                "querystring_auth": AWS_QUERYSTRING_AUTH,
                "file_overwrite": AWS_S3_FILE_OVERWRITE,
            },
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    MEDIA_URL = f"{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/"
