from pathlib import Path
import re

from django.core.management.base import BaseCommand
from apps.boards.models import Board
from apps.catalog.models import HomeProductSectionConfig, HomeHeroSlide

class Command(BaseCommand):
    help = (
        "현재 admin/DB 상태를 bootstrap_community.py 의 specs 로 덤프합니다.\n"
        "(일회성 마이그레이션 / 초기 세팅 도구. 런타임 운영에서는 사용하지 않음)\n"
        "기본: stdout 으로 출력 (copy-paste).\n"
        "--bless : copy-paste 없이 bootstrap_community.py 를 직접 업데이트."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--bless',
            action='store_true',
            help='현재 DB 상태를 bootstrap_community.py 에 직접 반영 (자동). '
                 'admin 설정을 코드의 새로운 초기값으로 만들 때 사용.'
        )

    def handle(self, *args, **options):
        board_text = self._build_board_specs_text()
        section_text = self._build_section_specs_text()
        hero_text = self._build_hero_specs_text()

        if options.get('bless'):
            self._bless_to_source(board_text, section_text, hero_text)
            return

        # 기존 stdout (수동 copy-paste 용)
        self.stdout.write(self.style.SUCCESS("# === board_specs (copy to bootstrap_community.py) ==="))
        self.stdout.write(board_text)
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("# === section_specs (copy to bootstrap_community.py) ==="))
        self.stdout.write(section_text)
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("# === hero_specs (copy to bootstrap_community.py) ==="))
        self.stdout.write(hero_text)
        self.stdout.write("")
        self.stdout.write(self.style.WARNING(
            "주의: board_specs는 slug 기준으로 get_or_create 됩니다. "
            "section_specs는 title 기준 + board slug로 연결. "
            "hero_specs는 title 기준 (또는 slug) 으로 hero 슬라이드를 초기화합니다. "
            "이미지 경로는 media 아래 상대경로 (catalog/home-hero-slides/xxx.png 등) 입니다. "
            "붙여넣은 후 bootstrap_community.py 를 테스트하세요. "
            "더 편하게 하려면 --bless 옵션 사용."
        ))

    def _build_board_specs_text(self):
        lines = ["board_specs = ["]
        for board in Board.objects.all().order_by("sort_order", "id"):
            spec = {
                "slug": board.slug,
                "name": board.name,
                "board_type": board.board_type,
                "description": board.description,
                "is_visible": board.is_visible,
                "show_in_top_menu": board.show_in_top_menu,
                "audience": board.audience,
            }
            if board.board_type == "product" and getattr(board, "product_board_type", None):
                spec["product_board_type"] = board.product_board_type
            if board.sort_order:
                spec["sort_order"] = board.sort_order

            lines.append("    {")
            for k, v in spec.items():
                if isinstance(v, str):
                    lines.append(f'        "{k}": "{v}",')
                else:
                    lines.append(f'        "{k}": {v},')
            lines.append("    },")
        lines.append("]")
        return "\n".join(lines)

    def _build_section_specs_text(self):
        lines = ["section_specs = ["]
        for section in HomeProductSectionConfig.objects.all().order_by("sort_order", "id"):
            board_slug = section.board.slug if section.board else None
            spec = {
                "title": section.title,
                "description": section.description,
                "source_type": section.source_type,
                "board": board_slug,
                "category_keyword": section.category_keyword,
                "item_limit": section.item_limit,
                "sort_order": section.sort_order,
            }
            lines.append("    {")
            for k, v in spec.items():
                if isinstance(v, str):
                    lines.append(f'        "{k}": "{v}",')
                elif v is None:
                    lines.append(f'        "{k}": None,')
                else:
                    lines.append(f'        "{k}": {v},')
            lines.append("    },")
        lines.append("]")
        return "\n".join(lines)

    def _build_hero_specs_text(self):
        """히어로 슬라이드 현재 상태를 bootstrap 용 hero_specs 로 덤프.
        admin(히어로섹션)에서 이미지를 등록하면 이 스펙에 포함되어 셋업(bootstrap) 기본값으로 사용 가능.
        """
        lines = ["hero_specs = ["]
        for slide in HomeHeroSlide.objects.all().order_by("sort_order", "id"):
            image_name = slide.image.name if slide.image else ""
            spec = {
                "title": slide.title,
                "description": slide.description,
                "badge": slide.badge or "",
                "href": slide.href or "",
                "image": image_name,  # media 상대 경로 (예: catalog/home-hero-slides/xxx.png)
                "display_seconds": slide.display_seconds or 3,
                "transition_style": slide.transition_style or "next",
                "sort_order": slide.sort_order,
                "is_active": slide.is_active,
            }
            lines.append("    {")
            for k, v in spec.items():
                if isinstance(v, str):
                    lines.append(f'        "{k}": "{v}",')
                else:
                    lines.append(f'        "{k}": {v},')
            lines.append("    },")
        lines.append("]")
        return "\n".join(lines)

    def _bless_to_source(self, board_text: str, section_text: str, hero_text: str):
        """현재 DB 상태로 bootstrap_community.py 를 직접 업데이트 (백업 생성).
        hero 섹션 이미지도 포함하여 셋업(bootstrap) 기본값으로 반영.
        """
        cmd_file = Path(__file__).resolve()
        target = cmd_file.parent / "bootstrap_community.py"
        if not target.exists():
            self.stdout.write(self.style.ERROR(f"대상 파일 없음: {target}"))
            return

        original = target.read_text(encoding="utf-8")

        # board_specs 블록 교체
        board_pattern = r"board_specs = \[.*?\n\]"
        new_content = re.sub(board_pattern, board_text, original, flags=re.DOTALL)

        # section_specs 블록 교체
        section_pattern = r"section_specs = \[.*?\n\]"
        new_content = re.sub(section_pattern, section_text, new_content, flags=re.DOTALL)

        # hero_specs 블록 교체 (히어로섹션 등록 이미지가 셋업 메뉴/기본값에 포함되도록)
        hero_pattern = r"hero_specs = \[.*?\n\]"
        if re.search(hero_pattern, new_content, flags=re.DOTALL):
            new_content = re.sub(hero_pattern, hero_text, new_content, flags=re.DOTALL)
        else:
            # hero_specs 블록이 아직 없으면 적당한 위치(예: section 뒤)에 삽입
            new_content = new_content.replace(
                "# === section_specs",
                hero_text + "\n\n# === section_specs"
            )

        if new_content == original:
            self.stdout.write(self.style.WARNING("변경 없음 (이미 동일하거나 패턴 매칭 실패)."))
            return

        # 백업
        backup = target.with_suffix(".py.bak")
        backup.write_text(original, encoding="utf-8")

        target.write_text(new_content, encoding="utf-8")
        self.stdout.write(self.style.SUCCESS(f"✅ {target} 업데이트 완료"))
        self.stdout.write(f"백업 생성: {backup}")
        self.stdout.write("git diff 확인 → commit → backend redeploy 하세요.")
        self.stdout.write("이제 admin(히어로섹션 포함)에서 설정한 이 상태가 bootstrap 의 새로운 초기값입니다.")
        self.stdout.write("히어로 이미지는 media 경로(catalog/home-hero-slides/...) 로 참조되니, 실제 이미지 파일도 함께 배포/시드하세요.")
