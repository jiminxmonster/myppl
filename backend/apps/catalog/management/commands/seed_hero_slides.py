from __future__ import annotations

import io

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from PIL import Image, ImageDraw

from apps.catalog.models import HomeHeroSlide


class Command(BaseCommand):
    help = "히어로 섹션에 샘플 슬라이드 이미지를 자동 생성해 채웁니다."

    def add_arguments(self, parser):
        parser.add_argument("--replace", action="store_true", help="기존 히어로 슬라이드를 모두 교체합니다.")

    def handle(self, *args, **options):
        if options["replace"]:
            HomeHeroSlide.objects.all().delete()
        else:
            HomeHeroSlide.objects.filter(title__in=["오늘의 특가", "신상 모아보기", "중고장터 추천", "커뮤니티 실시간"]).delete()

        slides = [
            (
                "비싼광고 No, 나만의 상품을 싸게 홍보한다.",
                "판매자가 직접 올린 상품을 MYPPL 상품리스트와 커뮤니티 흐름 안에서 자연스럽게 노출합니다.",
                "/marketplace/sell",
                "fade",
                ("#063F39", "#0B6B5E", "#F59E0B"),
            ),
            (
                "가격대비, 최고의 효율 광고",
                "조회수 기반 상품 노출과 카테고리 탐색으로 광고비 대비 효율을 높입니다.",
                "/products",
                "slide_lr",
                ("#102A43", "#0F766E", "#84CC16"),
            ),
            (
                "소비자끼리 서로 공유하고, 좋은 상품 발견하자",
                "구매자와 판매자가 상품 정보를 나누고 조건에 맞는 좋은 상품을 함께 발견합니다.",
                "/boards",
                "cinema",
                ("#1E3A5F", "#0F766E", "#F97316"),
            ),
        ]

        created_count = 0
        updated_count = 0
        for index, (title, desc, href, transition, colors) in enumerate(slides):
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

            image_bytes = self._build_slide_image(colors=colors)
            slide.image.save(f"myppl-hero-ad-{index + 1}.png", ContentFile(image_bytes), save=False)
            slide.save()

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"히어로 슬라이드 반영 완료: 생성 {created_count}개, 갱신 {updated_count}개"))

    def _build_slide_image(self, *, colors: tuple[str, str, str]) -> bytes:
        width, height = 1920, 540
        image = Image.new("RGB", (width, height), colors[0])
        draw = ImageDraw.Draw(image, "RGBA")

        start = self._hex_to_rgb(colors[0])
        middle = self._hex_to_rgb(colors[1])
        end = self._hex_to_rgb(colors[2])
        for x in range(width):
            ratio = x / max(width - 1, 1)
            if ratio < 0.55:
                local = ratio / 0.55
                rgb = tuple(round(start[channel] + (middle[channel] - start[channel]) * local) for channel in range(3))
            else:
                local = (ratio - 0.55) / 0.45
                rgb = tuple(round(middle[channel] + (end[channel] - middle[channel]) * local) for channel in range(3))
            draw.line([(x, 0), (x, height)], fill=(*rgb, 255))

        draw.ellipse((1500, -160, 2040, 380), fill=(255, 255, 255, 22))
        draw.ellipse((1700, 310, 2050, 660), fill=(15, 23, 42, 42))
        draw.polygon([(0, 390), (520, 330), (960, 432), (1320, 350), (1920, 190), (1920, 540), (0, 540)], fill=(255, 255, 255, 22))

        for offset, scale in ((0, 1.0), (300, 1.18)):
            left = 1120 + offset
            top = 100 - int(offset * 0.08)
            card_width = int(250 * scale)
            card_height = int(310 * scale)
            draw.rounded_rectangle((left + 12, top + 20, left + card_width + 12, top + card_height + 20), radius=32, fill=(0, 0, 0, 32))
            draw.rounded_rectangle((left, top, left + card_width, top + card_height), radius=32, fill=(255, 255, 255, 226))
            draw.rounded_rectangle((left + 38, top + 38, left + card_width - 38, top + 170), radius=22, fill=(204, 251, 241, 230))
            draw.rounded_rectangle((left + 38, top + 204, left + card_width - 72, top + 224), radius=10, fill=(15, 118, 110, 210))
            draw.rounded_rectangle((left + 38, top + 246, left + card_width - 118, top + 282), radius=18, fill=(245, 158, 11, 225))

        stream = io.BytesIO()
        image.save(stream, format="PNG", optimize=True)
        return stream.getvalue()

    def _hex_to_rgb(self, value: str) -> tuple[int, int, int]:
        clean = value.lstrip("#")
        return tuple(int(clean[index : index + 2], 16) for index in (0, 2, 4))
