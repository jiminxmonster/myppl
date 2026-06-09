from django.core.management.base import BaseCommand
from apps.boards.models import Board
from apps.catalog.models import HomeProductSectionConfig

class Command(BaseCommand):
    help = (
        "현재 admin/DB 상태를 bootstrap_community.py 의 specs 로 덤프합니다.\n"
        "사용법: python manage.py dump_bootstrap_specs\n"
        "출력을 복사해서 bootstrap_community.py 의 board_specs / section_specs 에 붙여넣으세요.\n"
        "대량 admin 수정 후 '마지막 상태'를 코드에 반영할 때 사용."
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("# === board_specs (copy to bootstrap_community.py) ==="))
        self.stdout.write("board_specs = [")

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
            if board.board_type == "product" and hasattr(board, "product_board_type") and board.product_board_type:
                spec["product_board_type"] = board.product_board_type
            if board.sort_order:
                spec["sort_order"] = board.sort_order

            # pretty print
            self.stdout.write("    {")
            for k, v in spec.items():
                if isinstance(v, str):
                    self.stdout.write(f'        "{k}": "{v}",')
                else:
                    self.stdout.write(f'        "{k}": {v},')
            self.stdout.write("    },")

        self.stdout.write("]")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("# === section_specs (copy to bootstrap_community.py) ==="))
        self.stdout.write("section_specs = [")

        for section in HomeProductSectionConfig.objects.all().order_by("sort_order", "id"):
            board_slug = section.board.slug if section.board else None
            spec = {
                "title": section.title,
                "description": section.description,
                "source_type": section.source_type,
                "board": board_slug,  # slug reference, resolve in bootstrap
                "category_keyword": section.category_keyword,
                "item_limit": section.item_limit,
                "sort_order": section.sort_order,
            }
            self.stdout.write("    {")
            for k, v in spec.items():
                if isinstance(v, str):
                    self.stdout.write(f'        "{k}": "{v}",')
                elif v is None:
                    self.stdout.write(f'        "{k}": None,')
                else:
                    self.stdout.write(f'        "{k}": {v},')
            self.stdout.write("    },")

        self.stdout.write("]")

        self.stdout.write("")
        self.stdout.write(self.style.WARNING(
            "주의: board_specs는 slug 기준으로 get_or_create 됩니다. "
            "section_specs는 title 기준 + board slug로 연결. "
            "붙여넣은 후 bootstrap_community.py 를 테스트하세요."
        ))
