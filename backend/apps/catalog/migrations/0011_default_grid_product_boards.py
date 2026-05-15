from django.db import migrations


def normalize_title(value):
    return "".join((value or "").split()).lower()


def ensure_default_grid_boards(apps, schema_editor):
    Board = apps.get_model("boards", "Board")
    HomeProductSectionConfig = apps.get_model("catalog", "HomeProductSectionConfig")

    board_specs = [
        {
            "slug": "live-special",
            "name": "라이브특가",
            "description": "타사 라이브 방송 링크를 연결해 노출하는 라이브특가 그리드형 게시판입니다.",
            "product_board_type": "live_special",
            "sort_order": 10,
        },
        {
            "slug": "seller-hot-issues",
            "name": "판매자 공유 핫이슈",
            "description": "판매자 공유 핫이슈 상품을 그리드로 모아 보여주는 게시판입니다.",
            "product_board_type": "standard",
            "sort_order": 11,
        },
        {
            "slug": "community-grid",
            "name": "커뮤니티",
            "description": "커뮤니티 상품형 게시물을 그리드로 모아 보여주는 게시판입니다.",
            "product_board_type": "standard",
            "sort_order": 12,
        },
    ]

    boards = {}
    for spec in board_specs:
        expected_values = {
            "name": spec["name"],
            "board_type": "product",
            "product_board_type": spec["product_board_type"],
            "description": spec["description"],
            "is_visible": True,
            "show_in_top_menu": True,
            "sort_order": spec["sort_order"],
        }
        board, created = Board.objects.get_or_create(
            slug=spec["slug"],
            defaults={
                **expected_values,
                "audience": "all",
                "min_grade": "seed",
                "write_grade": "member",
                "comment_grade": "member",
                "read_permission": "public",
                "allow_anonymous": True,
                "allow_anonymous_post": False,
                "allow_file_upload": True,
                "use_category": False,
            },
        )
        update_fields = []
        for field, expected in expected_values.items():
            if getattr(board, field) != expected:
                setattr(board, field, expected)
                update_fields.append(field)
        if update_fields and not created:
            board.save(update_fields=update_fields)
        boards[spec["slug"]] = board

    section_specs = [
        {
            "title": "라이브특가",
            "title_aliases": {"라이브특가", "라이브 특가"},
            "board_slug": "live-special",
            "sort_order": 0,
            "item_limit": 30,
        },
        {
            "title": "판매자 공유 핫이슈",
            "title_aliases": {"판매자공유핫이슈", "판매자 공유 핫이슈"},
            "board_slug": "seller-hot-issues",
            "sort_order": 1,
            "item_limit": 30,
        },
        {
            "title": "커뮤니티",
            "title_aliases": {"커뮤니티"},
            "board_slug": "community-grid",
            "sort_order": 3,
            "item_limit": 30,
        },
    ]

    existing_sections = list(HomeProductSectionConfig.objects.all())
    for spec in section_specs:
        aliases = {normalize_title(item) for item in spec["title_aliases"]}
        section = next((item for item in existing_sections if normalize_title(item.title) in aliases), None)
        board = boards[spec["board_slug"]]
        defaults = {
            "description": "",
            "source_type": "product_board",
            "board": board,
            "category_keyword": "",
            "item_limit": spec["item_limit"],
            "sort_order": spec["sort_order"],
            "is_active": True,
        }
        if section is None:
            section = HomeProductSectionConfig.objects.create(title=spec["title"], **defaults)
            existing_sections.append(section)
            continue

        update_fields = []
        if section.title != spec["title"]:
            section.title = spec["title"]
            update_fields.append("title")
        for field, expected in defaults.items():
            current = section.board_id if field == "board" else getattr(section, field)
            expected_value = expected.id if field == "board" else expected
            if current != expected_value:
                setattr(section, field, expected)
                update_fields.append(field)
        if update_fields:
            section.save(update_fields=update_fields)


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0010_home_section_product_board_source"),
        ("boards", "0008_product_board_live_special"),
    ]

    operations = [
        migrations.RunPython(ensure_default_grid_boards, migrations.RunPython.noop),
    ]
