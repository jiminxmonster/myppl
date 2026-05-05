"""개발 환경 Django 설정."""

from .base import *

DEBUG = True
# 로컬 도커/프록시/SSR 내부 호출까지 허용하기 위해 개발 환경에서는 호스트를 넓게 연다.
ALLOWED_HOSTS = ["*"]
