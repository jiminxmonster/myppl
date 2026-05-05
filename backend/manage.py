#!/usr/bin/env python3
"""Django 관리 명령 진입점."""

import os
import sys


def main() -> None:
    """기본 설정 모듈을 지정하고 Django 관리 명령을 실행한다."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
