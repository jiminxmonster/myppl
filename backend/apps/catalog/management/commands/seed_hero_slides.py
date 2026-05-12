from __future__ import annotations

import io
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from PIL import Image, ImageEnhance

from apps.catalog.models import HomeHeroSlide


class Command(BaseCommand):
    help = "히어로 섹션에 샘플 슬라이드 이미지를 자동 생성해 채웁니다."

    def add_arguments(self, parser):
        parser.add_argument("--replace", action="store_true", help="기존 히어로 슬라이드를 모두 교체합니다.")

    def handle(self, *args, **options):
        if options["replace"]:
            HomeHeroSlide.objects.all().delete()

        slides = [
            ("오늘의 특가", "지금 가장 인기 있는 할인 상품을 빠르게 확인하세요.", "https://myppl.co.kr/", "fade", "#0f766e"),
            ("신상 모아보기", "카테고리별 신상품을 한 번에 비교해 보세요.", "https://myppl.co.kr/products", "slide_lr", "#1d4ed8"),
            ("중고장터 추천", "검증된 판매자 상품을 안전하게 둘러보세요.", "https://myppl.co.kr/products?market=used", "zoom", "#9333ea"),
            ("커뮤니티 실시간", "구매자·판매자 커뮤니티 인기글을 놓치지 마세요.", "https://myppl.co.kr/buyer-community", "wipe", "#ea580c"),
        ]

        created_count = 0
        updated_count = 0
        for index, (title, desc, href, transition, color) in enumerate(slides):
            slide, created = HomeHeroSlide.objects.get_or_create(
                title=title,
                defaults={
                    "description": desc,
                    "href": href,
                    "transition_style": transition,
                    "display_seconds": 4,
                    "is_active": True,
                    "sort_order": index,
                },
            )

            slide.description = desc
            slide.href = href
            slide.transition_style = transition
            slide.display_seconds = 4
            slide.is_active = True
            slide.sort_order = index

            image_bytes = self._build_slide_image(title=title, description=desc, hex_color=color)
            slide.image.save(f"hero-seed-{index + 1}.png", ContentFile(image_bytes), save=False)
            slide.save()

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"히어로 슬라이드 반영 완료: 생성 {created_count}개, 갱신 {updated_count}개"))

    def _build_slide_image(self, *, title: str, description: str, hex_color: str) -> bytes:
        width, height = 1920, 540
        image = Image.new("RGB", (width, height), hex_color)

        root = Path(__file__).resolve().parents[6]
        background_path = root / "frontend" / "public" / "branding" / "promotion_001.png"
        if background_path.exists():
            base = Image.open(background_path).convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
            base = ImageEnhance.Brightness(base).enhance(0.8)
            overlay = Image.new("RGB", (width, height), hex_color)
            image = Image.blend(base, overlay, alpha=0.35)

        stream = io.BytesIO()
        image.save(stream, format="PNG", optimize=True)
        return stream.getvalue()
