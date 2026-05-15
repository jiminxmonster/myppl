from django.db import migrations


def normalize_title(value):
    return "".join((value or "").split()).lower()


def fill_missing_default_settings(apps, schema_editor):
    Board = apps.get_model("boards", "Board")
    ExternalProvider = apps.get_model("catalog", "ExternalProvider")
    HomeHeroSlide = apps.get_model("catalog", "HomeHeroSlide")
    HomeProductSectionConfig = apps.get_model("catalog", "HomeProductSectionConfig")
    SiteDisplaySetting = apps.get_model("catalog", "SiteDisplaySetting")

    SiteDisplaySetting.objects.get_or_create(id=1, defaults={"show_side_category_menu": False})

    provider_specs = [
        {
            "code": "coupang",
            "name": "쿠팡",
            "provider_type": "api",
            "base_url": "https://api-gateway.coupang.com",
            "credentials_hint": "Access Key, Secret Key, vendorId를 환경변수로 관리합니다.",
            "is_active": True,
        },
        {
            "code": "manual-json",
            "name": "수동 JSON 불러오기",
            "provider_type": "feed",
            "base_url": "",
            "credentials_hint": "외부 API 응답 JSON을 붙여 넣어 미리보기로 등록할 때 사용합니다.",
            "is_active": True,
        },
    ]
    for spec in provider_specs:
        ExternalProvider.objects.get_or_create(code=spec["code"], defaults=spec)

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
        board, _ = Board.objects.get_or_create(
            slug=spec["slug"],
            defaults={
                "name": spec["name"],
                "board_type": "product",
                "product_board_type": spec["product_board_type"],
                "audience": "all",
                "description": spec["description"],
                "sort_order": spec["sort_order"],
                "is_visible": True,
                "show_in_top_menu": True,
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
        boards[spec["slug"]] = board

    section_specs = [
        {
            "title": "라이브특가",
            "aliases": {"라이브특가", "라이브 특가"},
            "board_slug": "live-special",
            "sort_order": 0,
        },
        {
            "title": "판매자 공유 핫이슈",
            "aliases": {"판매자공유핫이슈", "판매자 공유 핫이슈"},
            "board_slug": "seller-hot-issues",
            "sort_order": 1,
        },
        {
            "title": "커뮤니티",
            "aliases": {"커뮤니티"},
            "board_slug": "community-grid",
            "sort_order": 3,
        },
    ]
    existing_sections = list(HomeProductSectionConfig.objects.all())
    for spec in section_specs:
        aliases = {normalize_title(alias) for alias in spec["aliases"]}
        if any(normalize_title(section.title) in aliases for section in existing_sections):
            continue
        board = boards.get(spec["board_slug"])
        if board is None:
            continue
        section = HomeProductSectionConfig.objects.create(
            title=spec["title"],
            description="",
            source_type="product_board",
            board=board,
            category_keyword="",
            item_limit=30,
            sort_order=spec["sort_order"],
            is_active=True,
        )
        existing_sections.append(section)

    if HomeHeroSlide.objects.exists():
        return

    hero_specs = [
        {
            "title": "메인 프로모션",
            "description": "운영자가 히어로섹션에서 교체할 수 있는 기본 슬라이드입니다.",
            "badge": "광고",
            "href": "/products",
            "sort_order": 0,
            "display_seconds": 4,
            "transition_style": "next",
        },
        {
            "title": "라이브특가",
            "description": "라이브특가 게시판으로 연결되는 기본 슬라이드입니다.",
            "badge": "라이브",
            "href": "/boards/live-special",
            "sort_order": 1,
            "display_seconds": 4,
            "transition_style": "slide_lr",
        },
        {
            "title": "판매자 공유 핫이슈",
            "description": "판매자 공유 핫이슈 게시판으로 연결되는 기본 슬라이드입니다.",
            "badge": "핫이슈",
            "href": "/boards/seller-hot-issues",
            "sort_order": 2,
            "display_seconds": 4,
            "transition_style": "fade",
        },
    ]
    for spec in hero_specs:
        HomeHeroSlide.objects.create(image="", is_active=True, **spec)


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0011_default_grid_product_boards"),
        ("boards", "0008_product_board_live_special"),
    ]

    operations = [
        migrations.RunPython(fill_missing_default_settings, migrations.RunPython.noop),
    ]
