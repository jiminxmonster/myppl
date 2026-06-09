from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.boards.models import Board, Comment, Post
from apps.catalog.models import CategoryFilter, CategoryFilterOption, ExternalProvider, HomeProductSectionConfig, ProductCategory
from apps.hotdeals.models import Hotdeal, HotdealCategory
from apps.marketplace.models import MarketplaceCategory, MarketplaceItem


class Command(BaseCommand):
    """초기 게시판/관리자/샘플 데이터를 생성한다."""

    help = "커뮤니티 기본 게시판, 관리자 계정, 샘플 데이터를 생성합니다."

    def add_arguments(self, parser):
        """관리자 계정과 샘플 데이터 옵션을 받는다."""
        parser.add_argument("--admin-username", default="admin")
        parser.add_argument("--admin-email", default="admin@example.com")
        parser.add_argument("--admin-password", default="admin")
        parser.add_argument("--with-sample-data", action="store_true")

    def handle(self, *args, **options):
        """기본 데이터 생성 순서를 실행한다."""
        user = self._ensure_admin_user(
            username=options["admin_username"],
            email=options["admin_email"],
            password=options["admin_password"],
        )
        self._ensure_default_role_users()
        boards = self._ensure_boards()
        self._ensure_product_catalog(user=user)
        self._ensure_external_providers()
        self._ensure_home_product_sections(boards=boards)
        self._ensure_hotdeal_categories()
        self._ensure_marketplace_categories()

        if options["with_sample_data"]:
            self._ensure_sample_content(user=user, boards=boards)

        self.stdout.write(self.style.SUCCESS("커뮤니티 부트스트랩이 완료되었습니다."))

    def _ensure_admin_user(self, *, username: str, email: str, password: str):
        """운영자 권한의 기본 관리자를 생성한다."""
        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "nickname": "운영자",
                "is_staff": True,
                "is_superuser": True,
                "grade": user_model.GRADE_ADMIN,
                "operator_role": user_model.OPERATOR_SUPERADMIN,
            },
        )

        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f"관리자 계정을 생성했습니다: {username}"))
        else:
            update_fields = []
            if not user.check_password(password):
                user.set_password(password)
                update_fields.append("password")
            if user.operator_role != user_model.OPERATOR_SUPERADMIN:
                user.operator_role = user_model.OPERATOR_SUPERADMIN
                update_fields.append("operator_role")
            if not user.is_staff:
                user.is_staff = True
                update_fields.append("is_staff")
            if not user.is_superuser:
                user.is_superuser = True
                update_fields.append("is_superuser")
            if update_fields:
                if "password" in update_fields:
                    user.save()
                else:
                    user.save(update_fields=update_fields)
            self.stdout.write(self.style.WARNING(f"관리자 계정이 이미 존재합니다: {username}"))

        return user

    def _ensure_boards(self):
        """문서 기준의 기본 게시판을 생성한다."""
        board_specs = [
            {
                "slug": "buyer-community",
                "name": "구매자커뮤니티",
                "board_type": Board.BOARD_GENERAL,
                "description": "구매자들이 원하는 상품, 후기, 요청사항을 나누는 기본 커뮤니티입니다.",
                "is_visible": True,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_BUYER,
            },
            {
                "slug": "seller-community",
                "name": "판매자커뮤니티",
                "board_type": Board.BOARD_GENERAL,
                "description": "판매자들이 판매 전략, 등록 팁, 운영 정보를 나누는 기본 커뮤니티입니다.",
                "is_visible": True,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_SELLER,
            },
            {
                "slug": "notice",
                "name": "공지사항",
                "board_type": Board.BOARD_NOTICE,
                "description": "운영 공지와 필독 안내를 올리는 게시판입니다.",
                "is_visible": True,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_ALL,
            },
            {
                "slug": "hotdeal-board",
                "name": "핫딜 게시판",
                "board_type": Board.BOARD_HOTDEAL,
                "description": "핫딜 정보와 가격 비교를 공유하는 게시판입니다.",
                "is_visible": False,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_ALL,
            },
            {
                "slug": "market-board",
                "name": "중고장터 게시판",
                "board_type": Board.BOARD_MARKETPLACE,
                "description": "개인 간 거래와 후기를 공유하는 게시판입니다.",
                "is_visible": False,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_ALL,
            },
            {
                "slug": "free",
                "name": "자유게시판",
                "board_type": Board.BOARD_GENERAL,
                "description": "기존 게시물 호환을 위한 기본 게시판입니다.",
                "is_visible": True,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_ALL,
            },
            {
                "slug": "live-special",
                "name": "라이브특가",
                "board_type": Board.BOARD_PRODUCT,
                "product_board_type": Board.PRODUCT_BOARD_LIVE_SPECIAL,
                "description": "타사 라이브 방송 링크를 연결해 노출하는 라이브특가 그리드형 게시판입니다.",
                "is_visible": True,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_ALL,
                "sort_order": 10,
            },
            {
                "slug": "seller-hot-issues",
                "name": "판매자공유핫이슈",
                "board_type": Board.BOARD_PRODUCT,
                "product_board_type": Board.PRODUCT_BOARD_STANDARD,
                "description": "판매자 공유 핫이슈 상품을 그리드로 모아 보여주는 게시판입니다.",
                "is_visible": True,
                "show_in_top_menu": True,
                "audience": Board.AUDIENCE_ALL,
                "sort_order": 11,
            },
            {
                "slug": "community-grid",
                "name": "소비자공유핫이슈",
                "board_type": Board.BOARD_PRODUCT,
                "product_board_type": Board.PRODUCT_BOARD_STANDARD,
                "description": "커뮤니티 상품형 게시물을 그리드로 모아 보여주는 게시판입니다.",
                "is_visible": True,
                "show_in_top_menu": True,
                "audience": Board.AUDIENCE_ALL,
                "sort_order": 12,
            },
        ]

        boards = {}
        for board_spec in board_specs:
            board, created = Board.objects.get_or_create(slug=board_spec["slug"], defaults=board_spec)
            if not created:
                update_fields = []
                for field in (
                    "name",
                    "board_type",
                    "product_board_type",
                    "description",
                    "is_visible",
                    "show_in_top_menu",
                    "audience",
                    "sort_order",
                ):
                    if field not in board_spec:
                        continue
                    if getattr(board, field) != board_spec[field]:
                        setattr(board, field, board_spec[field])
                        update_fields.append(field)
                if update_fields:
                    board.save(update_fields=update_fields)
            boards[board.slug] = board
            message = "생성" if created else "유지"
            self.stdout.write(f"[게시판] {board.name} ({board.slug}) {message}")

        return boards

    def _ensure_default_role_users(self):
        """구매자/판매자 기본 계정을 생성한다."""
        user_model = get_user_model()
        default_users = [
            {
                "username": "buy",
                "email": "buy@example.com",
                "nickname": "구매자",
                "password": "buy",
                "member_type": user_model.MEMBER_BUYER,
            },
            {
                "username": "sell",
                "email": "sell@example.com",
                "nickname": "판매자",
                "password": "sell",
                "member_type": user_model.MEMBER_SELLER,
            },
        ]

        for user_spec in default_users:
            user, created = user_model.objects.get_or_create(
                username=user_spec["username"],
                defaults={
                    "email": user_spec["email"],
                    "nickname": user_spec["nickname"],
                    "member_type": user_spec["member_type"],
                },
            )
            update_fields = []
            if user.member_type != user_spec["member_type"]:
                user.member_type = user_spec["member_type"]
                update_fields.append("member_type")
            if user.nickname != user_spec["nickname"]:
                user.nickname = user_spec["nickname"]
                update_fields.append("nickname")
            if not user.check_password(user_spec["password"]):
                user.set_password(user_spec["password"])
                if created:
                    user.save()
                else:
                    user.save()
                self.stdout.write(self.style.SUCCESS(f"기본 {user_spec['nickname']} 계정을 준비했습니다: {user_spec['username']}"))
                continue
            if update_fields:
                user.save(update_fields=update_fields)

    def _ensure_product_catalog(self, *, user):
        """메인 좌측 메뉴와 상품 탐색용 기본 카테고리/필터를 생성한다."""
        category_specs = [
            {
                "name": "골프",
                "description": "골프백, 캐디백, 골프화, 골프웨어 등 골프용품 상품군입니다.",
                "sort_order": 0,
                "filters": [
                    {"name": "브랜드", "options": ["테일러메이드", "타이틀리스트", "캘러웨이", "미즈노", "핑"]},
                    {"name": "색상", "options": ["블랙", "화이트", "네이비", "레드", "그레이"]},
                ],
            },
            {
                "name": "노트북",
                "description": "게이밍, 업무용, 휴대용 노트북 상품군입니다.",
                "sort_order": 1,
                "filters": [
                    {"name": "브랜드", "options": ["LG", "삼성", "레노버", "ASUS", "MSI"]},
                    {"name": "화면 크기", "options": ["13인치", "14인치", "15인치", "16인치", "17인치"]},
                ],
            },
            {
                "name": "세탁기",
                "description": "드럼, 통돌이, 건조기 결합형 가전 상품군입니다.",
                "sort_order": 2,
                "filters": [
                    {"name": "용량", "options": ["10kg", "14kg", "17kg", "21kg"]},
                    {"name": "브랜드", "options": ["LG", "삼성", "위니아"]},
                ],
            },
            {
                "name": "TV",
                "description": "스마트TV, 대형TV, 게이밍 디스플레이 상품군입니다.",
                "sort_order": 3,
                "filters": [
                    {"name": "크기", "options": ["43인치", "55인치", "65인치", "75인치"]},
                    {"name": "패널", "options": ["OLED", "QLED", "LED", "Mini LED"]},
                ],
            },
        ]

        for category_spec in category_specs:
            category, _ = ProductCategory.objects.get_or_create(
                name=category_spec["name"],
                defaults={
                    "description": category_spec["description"],
                    "sort_order": category_spec["sort_order"],
                    "created_by": user,
                    "is_active": True,
                    "is_visible": True,
                },
            )
            for filter_index, filter_spec in enumerate(category_spec["filters"]):
                category_filter, _ = CategoryFilter.objects.get_or_create(
                    category=category,
                    name=filter_spec["name"],
                    defaults={
                        "filter_type": CategoryFilter.TYPE_CHECKBOX,
                        "source_mode": CategoryFilter.SOURCE_HYBRID,
                        "sort_order": filter_index,
                        "is_visible": True,
                    },
                )
                for option_index, option_label in enumerate(filter_spec["options"]):
                    CategoryFilterOption.objects.get_or_create(
                        filter=category_filter,
                        label=option_label,
                        defaults={
                            "normalized_value": option_label,
                            "sort_order": option_index,
                        "is_active": True,
                    },
                )

    def _ensure_external_providers(self):
        """판매자 상품 불러오기에서 사용할 기본 외부 제공자를 준비한다."""
        provider_specs = [
            {
                "code": "coupang",
                "name": "쿠팡",
                "provider_type": ExternalProvider.TYPE_API,
                "base_url": "https://api-gateway.coupang.com",
                "credentials_hint": "Access Key, Secret Key, vendorId를 환경변수로 관리합니다.",
                "is_active": True,
            },
            {
                "code": "manual-json",
                "name": "수동 JSON 불러오기",
                "provider_type": ExternalProvider.TYPE_FEED,
                "base_url": "",
                "credentials_hint": "외부 API 응답 JSON을 붙여 넣어 미리보기로 등록할 때 사용합니다.",
                "is_active": True,
            },
        ]

        for provider_spec in provider_specs:
            provider, created = ExternalProvider.objects.get_or_create(
                code=provider_spec["code"],
                defaults=provider_spec,
            )
            if not created:
                update_fields = []
                for field in ("name", "provider_type", "base_url", "credentials_hint", "is_active"):
                    expected_value = provider_spec.get(field)
                    if getattr(provider, field) != expected_value:
                        setattr(provider, field, expected_value)
                        update_fields.append(field)
                if update_fields:
                    provider.save(update_fields=update_fields)

    def _ensure_home_product_sections(self, *, boards):
        """메인 홈의 그리드형 상품 탭 기본값을 준비한다."""
        section_specs = [
            {
                "title": "라이브특가",
                "description": "라이브특가 그리드형 게시판 상품을 노출합니다.",
                "source_type": HomeProductSectionConfig.SOURCE_PRODUCT_BOARD,
                "board": boards.get("live-special"),
                "category_keyword": "",
                "item_limit": 30,
                "sort_order": 0,
            },
            {
                "title": "판매자 공유 핫이슈",
                "description": "판매자 공유 핫이슈 그리드형 게시판 상품을 노출합니다.",
                "source_type": HomeProductSectionConfig.SOURCE_PRODUCT_BOARD,
                "board": boards.get("seller-hot-issues"),
                "category_keyword": "",
                "item_limit": 30,
                "sort_order": 1,
            },
            {
                "title": "커뮤니티",
                "description": "커뮤니티 그리드형 게시판 상품을 노출합니다.",
                "source_type": HomeProductSectionConfig.SOURCE_PRODUCT_BOARD,
                "board": boards.get("community-grid"),
                "category_keyword": "",
                "item_limit": 30,
                "sort_order": 3,
            },
        ]

        for section_spec in section_specs:
            if section_spec["source_type"] == HomeProductSectionConfig.SOURCE_PRODUCT_BOARD and section_spec["board"] is None:
                continue
            section, created = HomeProductSectionConfig.objects.get_or_create(
                title=section_spec["title"],
                defaults={**section_spec, "is_active": True},
            )
            if created:
                continue
            update_fields = []
            for field in ("description", "source_type", "board", "category_keyword", "item_limit", "sort_order"):
                current = section.board_id if field == "board" else getattr(section, field)
                expected = section_spec[field].id if field == "board" and section_spec[field] is not None else section_spec[field]
                if current != expected:
                    setattr(section, field, section_spec[field])
                    update_fields.append(field)
            if not section.is_active:
                section.is_active = True
                update_fields.append("is_active")
            if update_fields:
                section.save(update_fields=update_fields)

    def _ensure_sample_content(self, *, user, boards):
        """초기 확인용 샘플 콘텐츠를 생성한다."""
        hotdeal_category = HotdealCategory.objects.order_by("sort_order", "id").first()
        market_category = MarketplaceCategory.objects.order_by("sort_order", "id").first()
        hotdeal_category_map = {item.name: item for item in HotdealCategory.objects.all()}
        market_category_map = {item.name: item for item in MarketplaceCategory.objects.all()}
        free_post, _ = Post.objects.get_or_create(
            board=boards["free"],
            author=user,
            title="커뮤니티 오픈 안내",
            defaults={
                "content": "이 게시글은 부트스트랩 명령으로 생성된 샘플 게시글입니다.",
            },
        )
        Comment.objects.get_or_create(
            post=free_post,
            author=user,
            content="샘플 댓글입니다. 대댓글과 알림 흐름 테스트에 사용할 수 있습니다.",
        )

        hotdeal_samples = [
            {
                "title": "샘플 무선 이어폰 핫딜",
                "category": hotdeal_category_map.get("가전/디지털", hotdeal_category),
                "description": "가전 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/hotdeal-earbuds",
                "original_price": Decimal("129000"),
                "sale_price": Decimal("89000"),
                "view_count": 231,
            },
            {
                "title": "샘플 로봇청소기 특가",
                "category": hotdeal_category_map.get("가전/디지털", hotdeal_category),
                "description": "가전 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/hotdeal-cleaner",
                "original_price": Decimal("499000"),
                "sale_price": Decimal("359000"),
                "view_count": 204,
            },
            {
                "title": "샘플 4K 모니터 특가",
                "category": hotdeal_category_map.get("가전/디지털", hotdeal_category),
                "description": "가전 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/hotdeal-monitor",
                "original_price": Decimal("399000"),
                "sale_price": Decimal("279000"),
                "view_count": 188,
            },
            {
                "title": "샘플 패션 스니커즈 특가",
                "category": hotdeal_category_map.get("패션/잡화", hotdeal_category),
                "description": "패션 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/fashion-hotdeal",
                "original_price": Decimal("159000"),
                "sale_price": Decimal("99000"),
                "view_count": 220,
            },
            {
                "title": "샘플 경량 바람막이 특가",
                "category": hotdeal_category_map.get("패션/잡화", hotdeal_category),
                "description": "패션 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/fashion-jacket",
                "original_price": Decimal("119000"),
                "sale_price": Decimal("69000"),
                "view_count": 176,
            },
            {
                "title": "샘플 가죽 크로스백 특가",
                "category": hotdeal_category_map.get("패션/잡화", hotdeal_category),
                "description": "패션 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/fashion-bag",
                "original_price": Decimal("89000"),
                "sale_price": Decimal("59000"),
                "view_count": 163,
            },
            {
                "title": "샘플 단백질 음료 묶음 특가",
                "category": hotdeal_category_map.get("식품/건강", hotdeal_category),
                "description": "식품/건강 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/food-hotdeal",
                "original_price": Decimal("42000"),
                "sale_price": Decimal("28900"),
                "view_count": 210,
            },
            {
                "title": "샘플 유기농 견과세트 특가",
                "category": hotdeal_category_map.get("식품/건강", hotdeal_category),
                "description": "식품/건강 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/food-nuts",
                "original_price": Decimal("32000"),
                "sale_price": Decimal("21900"),
                "view_count": 179,
            },
            {
                "title": "샘플 건강즙 패키지 특가",
                "category": hotdeal_category_map.get("식품/건강", hotdeal_category),
                "description": "식품/건강 카테고리 샘플 핫딜입니다.",
                "source_url": "https://example.com/food-juice",
                "original_price": Decimal("54000"),
                "sale_price": Decimal("34800"),
                "view_count": 165,
            },
        ]

        for sample in hotdeal_samples:
            Hotdeal.objects.update_or_create(
                title=sample["title"],
                author=user,
                defaults={
                    "category": sample["category"],
                    "description": sample["description"],
                    "source_url": sample["source_url"],
                    "original_price": sample["original_price"],
                    "sale_price": sample["sale_price"],
                    "view_count": sample["view_count"],
                    "expires_at": timezone.datetime(2030, 12, 31, 23, 59, tzinfo=timezone.get_current_timezone()),
                },
            )

        marketplace_samples = [
            {
                "title": "샘플 기계식 키보드",
                "category": market_category_map.get("디지털기기", market_category),
                "description": "디지털기기 카테고리 샘플 중고상품입니다.",
                "price": Decimal("85000"),
                "region": "서울",
                "is_negotiable": True,
                "view_count": 172,
            },
            {
                "title": "샘플 게이밍 노트북",
                "category": market_category_map.get("디지털기기", market_category),
                "description": "디지털기기 카테고리 샘플 중고상품입니다.",
                "price": Decimal("790000"),
                "region": "대전",
                "is_negotiable": False,
                "view_count": 228,
            },
            {
                "title": "샘플 태블릿 번들",
                "category": market_category_map.get("디지털기기", market_category),
                "description": "디지털기기 카테고리 샘플 중고상품입니다.",
                "price": Decimal("320000"),
                "region": "광주",
                "is_negotiable": True,
                "view_count": 191,
            },
            {
                "title": "샘플 패딩 점퍼",
                "category": market_category_map.get("패션/잡화", market_category),
                "description": "패션 카테고리 샘플 중고상품입니다.",
                "price": Decimal("65000"),
                "region": "부산",
                "is_negotiable": True,
                "view_count": 206,
            },
            {
                "title": "샘플 빈티지 워치",
                "category": market_category_map.get("패션/잡화", market_category),
                "description": "패션 카테고리 샘플 중고상품입니다.",
                "price": Decimal("148000"),
                "region": "서울",
                "is_negotiable": False,
                "view_count": 184,
            },
            {
                "title": "샘플 디자이너 토트백",
                "category": market_category_map.get("패션/잡화", market_category),
                "description": "패션 카테고리 샘플 중고상품입니다.",
                "price": Decimal("92000"),
                "region": "수원",
                "is_negotiable": True,
                "view_count": 166,
            },
            {
                "title": "샘플 에어프라이어",
                "category": market_category_map.get("가전", market_category),
                "description": "가전 카테고리 샘플 중고상품입니다.",
                "price": Decimal("43000"),
                "region": "인천",
                "is_negotiable": False,
                "view_count": 219,
            },
            {
                "title": "샘플 공기청정기",
                "category": market_category_map.get("가전", market_category),
                "description": "가전 카테고리 샘플 중고상품입니다.",
                "price": Decimal("118000"),
                "region": "울산",
                "is_negotiable": True,
                "view_count": 198,
            },
            {
                "title": "샘플 미니빔 프로젝터",
                "category": market_category_map.get("가전", market_category),
                "description": "가전 카테고리 샘플 중고상품입니다.",
                "price": Decimal("210000"),
                "region": "대구",
                "is_negotiable": True,
                "view_count": 181,
            },
        ]

        for sample in marketplace_samples:
            MarketplaceItem.objects.update_or_create(
                title=sample["title"],
                author=user,
                defaults={
                    "category": sample["category"],
                    "description": sample["description"],
                    "price": sample["price"],
                    "region": sample["region"],
                    "is_negotiable": sample["is_negotiable"],
                    "view_count": sample["view_count"],
                },
            )

        self.stdout.write(self.style.SUCCESS("샘플 데이터 생성을 완료했습니다."))

    def _ensure_hotdeal_categories(self):
        """핫딜 좌측 메뉴에 노출할 기본 카테고리를 생성한다."""
        category_specs = [
            ("가전/디지털", "전자기기와 디지털 기기 딜을 묶는 분류", 0),
            ("패션/잡화", "의류, 신발, 가방, 액세서리 딜 분류", 1),
            ("생활/주방", "생활용품, 주방용품, 청소용품 딜 분류", 2),
            ("식품/건강", "식품, 음료, 건강기능식품 딜 분류", 3),
        ]
        for name, description, sort_order in category_specs:
            category, created = HotdealCategory.objects.get_or_create(
                slug=name,
                defaults={
                    "name": name,
                    "description": description,
                    "sort_order": sort_order,
                    "is_visible": True,
                },
            )
            if not created:
                update_fields = []
                for field, expected in {
                    "name": name,
                    "description": description,
                    "sort_order": sort_order,
                    "is_visible": True,
                }.items():
                    if getattr(category, field) != expected:
                        setattr(category, field, expected)
                        update_fields.append(field)
                if update_fields:
                    category.save(update_fields=update_fields)
        first_category = HotdealCategory.objects.order_by("sort_order", "id").first()
        if first_category:
            Hotdeal.objects.filter(category__isnull=True).update(category=first_category)

    def _ensure_marketplace_categories(self):
        """중고장터 좌측 메뉴에 노출할 기본 카테고리를 생성한다."""
        category_specs = [
            ("디지털기기", "노트북, 태블릿, 휴대폰, 주변기기 거래 분류", 0),
            ("가전", "생활가전과 주방가전 거래 분류", 1),
            ("스포츠/레저", "골프, 자전거, 캠핑 등 취미용품 거래 분류", 2),
            ("패션/잡화", "의류, 신발, 가방, 시계 거래 분류", 3),
        ]
        for name, description, sort_order in category_specs:
            category, created = MarketplaceCategory.objects.get_or_create(
                slug=name,
                defaults={
                    "name": name,
                    "description": description,
                    "sort_order": sort_order,
                    "is_visible": True,
                },
            )
            if not created:
                update_fields = []
                for field, expected in {
                    "name": name,
                    "description": description,
                    "sort_order": sort_order,
                    "is_visible": True,
                }.items():
                    if getattr(category, field) != expected:
                        setattr(category, field, expected)
                        update_fields.append(field)
                if update_fields:
                    category.save(update_fields=update_fields)
        first_category = MarketplaceCategory.objects.order_by("sort_order", "id").first()
        if first_category:
            MarketplaceItem.objects.filter(category__isnull=True).update(category=first_category)
