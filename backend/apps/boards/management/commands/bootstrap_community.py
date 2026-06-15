from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.boards.models import Board, Comment, Post
from apps.catalog.models import CategoryFilter, CategoryFilterOption, ExternalProvider, HomeHeroSlide, HomeProductSectionConfig, ProductCategory
from apps.hotdeals.models import Hotdeal, HotdealCategory
from apps.marketplace.models import MarketplaceCategory, MarketplaceItem


class Command(BaseCommand):
    """최초 설치용 bootstrap (빈 DB에서만 동작).

    ============================================================
    MYPPL 운영 철학
    - GitHub = 코드 원본
    - PostgreSQL = 데이터 원본 (회원, 게시글, 상품, 카테고리, Hero, 메뉴, 운영 설정 등)
    - Admin panel = 운영 원본

    bootstrap_community 는 **최초 설치 / 빈 DB / 재해복구** 용도로만 사용한다.
    운영 중인 DB의 어떤 데이터도 UPDATE / 덮어쓰지 않는다.
    (Admin에서 변경한 메뉴, Hero, Section, 카테고리 등은 절대 건드리지 않음)

    유지하는 최소 기능:
    - 최초 superadmin 생성
    - 테스트용 기본 계정 (buy/sell) 생성 (비밀번호는 생성 시에만)
    - 필수 기본 게시판 생성 (빈 테이블일 때만)
    - 기본 카테고리/필터 (빈 테이블일 때만)
    - 선택적 샘플 데이터 (--with-sample-data)

    제거된 기능:
    - 모든 운영 설정 강제 동기화 (board_specs, hero, home sections, categories...)
    - 기존 계정 비밀번호/권한 강제 변경
    - bless / dump 의존성 (런타임용 아님)
    ============================================================
    """

    help = "최초 설치용 bootstrap (운영 DB 절대 덮어쓰지 않음)"

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
        self._ensure_hero_slides()
        self._ensure_hotdeal_categories()
        self._ensure_marketplace_categories()

        if options["with_sample_data"]:
            self._ensure_sample_content(user=user, boards=boards)

        # Test 계정 비밀번호 보장 (myppl-backend-temp 로그인용)
        # admin / buy / sell 은 문서화된 테스트 계정. 존재 여부와 관계없이 항상 알려진 비번으로 맞춰준다.
        # (다른 사용자 비번이나 운영 데이터는 절대 건드리지 않음)
        self._ensure_test_account_passwords()

        self.stdout.write(self.style.SUCCESS("커뮤니티 부트스트랩이 완료되었습니다."))

    def _ensure_admin_user(self, *, username: str, email: str, password: str):
        """최초 관리자 계정 생성 (설치용).

        운영 중인 DB에서는 비밀번호/권한을 절대 덮어쓰지 않는다.
        Admin panel에서 관리자가 직접 관리한다.
        """
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
            self.stdout.write(self.style.WARNING(f"관리자 계정이 이미 존재합니다 (비밀번호/권한 유지): {username}"))

        return user

    def _ensure_boards(self):
        """필수 게시판 최초 생성 (설치용, 빈 DB에서만).

        운영 데이터(메뉴 노출, 정렬, 카테고리 등)는 Admin panel이 원본.
        bootstrap은 절대 기존 운영 게시판을 건드리지 않는다.
        """
        if Board.objects.exists():
            self.stdout.write(
                self.style.WARNING("[게시판] 운영 데이터 존재 → bootstrap boards 스킵 (Admin panel 원본 유지)")
            )
            return {b.slug: b for b in Board.objects.all()}

        # 최초 설치 시에만 생성하는 최소 필수 게시판
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
                "slug": "free",
                "name": "자유게시판",
                "board_type": Board.BOARD_GENERAL,
                "description": "기존 게시물 호환을 위한 기본 게시판입니다.",
                "is_visible": True,
                "show_in_top_menu": False,
                "audience": Board.AUDIENCE_ALL,
            },
        ]

        boards = {}
        for spec in board_specs:
            board, created = Board.objects.get_or_create(slug=spec["slug"], defaults=spec)
            boards[board.slug] = board
            if created:
                self.stdout.write(f"[게시판] {board.name} ({board.slug}) 생성")
            else:
                self.stdout.write(f"[게시판] {board.name} ({board.slug}) 이미 존재")

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
            if created:
                user.set_password(user_spec["password"])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"기본 {user_spec['nickname']} 계정을 생성했습니다: {user_spec['username']}"))
            else:
                self.stdout.write(self.style.WARNING(f"기본 {user_spec['nickname']} 계정이 이미 존재합니다 (비밀번호 유지)"))

    def _ensure_product_catalog(self, *, user):
        """메인 좌측 메뉴와 상품 탐색용 기본 카테고리/필터를 생성한다.

        [운영 정책]
        - catalog_productcategory, categoryfilter, filteroption 은 운영 데이터.
        - 이미 카테고리가 존재하면 bootstrap 이 추가 생성/수정 시도하지 않음 (admin 이 관리).
        """
        if ProductCategory.objects.exists():
            self.stdout.write(
                self.style.WARNING("[상품카테고리] 운영 데이터 존재 → bootstrap product catalog 스킵 (Admin 설정 유지)")
            )
            return

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
            ExternalProvider.objects.get_or_create(
                code=provider_spec["code"],
                defaults=provider_spec,
            )

    def _ensure_home_product_sections(self, *, boards):
        """메인 홈의 그리드형 상품 탭 기본값을 준비한다.

        기존 운영 설정(어드민에서 수정한 제목/순서/연결 등)을 덮어쓰지 않도록 안전하게 변경.
        - 이미 해당 title의 섹션이 존재하면 건너뜀 (admin 변경 존중)
        - 없는 경우에만 생성
        """
        section_specs = [
            {
                "title": "판매자공유핫이슈",
                "description": "판매자공유핫이슈 그리드형 게시판 상품을 노출합니다.",
                "source_type": HomeProductSectionConfig.SOURCE_PRODUCT_BOARD,
                "board": boards.get("seller-hot-issues"),
                "category_keyword": "",
                "item_limit": 30,
                "sort_order": 1,
            },
            {
                "title": "소비자공유핫이슈",
                "description": "소비자공유핫이슈 그리드형 게시판 상품을 노출합니다.",
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
            # 이미 존재하면 덮어쓰지 않음 (기존 admin 설정 보호)
            if HomeProductSectionConfig.objects.filter(title=section_spec["title"]).exists():
                self.stdout.write(f"[홈섹션] {section_spec['title']} 이미 존재 → admin 설정 유지")
                continue
            section, created = HomeProductSectionConfig.objects.get_or_create(
                title=section_spec["title"],
                defaults={**section_spec, "is_active": True},
            )
            if created:
                self.stdout.write(f"[홈섹션] {section.title} 생성됨 (초기 시드)")

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
        """핫딜 좌측 메뉴에 노출할 기본 카테고리를 생성한다.

        [운영 정책]
        - hotdeals_hotdealcategory 는 운영 데이터 (admin 이 is_visible, sort_order, 이름 등을 관리).
        - 이미 데이터 존재 시 bootstrap 이 UPDATE 하지 않음.
        """
        if HotdealCategory.objects.exists():
            self.stdout.write(
                self.style.WARNING("[핫딜카테고리] 운영 데이터 존재 → bootstrap hotdeal categories 스킵 (Admin 설정 유지)")
            )
            return

        category_specs = [
            ("가전/디지털", "전자기기와 디지털 기기 딜을 묶는 분류", 0),
            ("패션/잡화", "의류, 신발, 가방, 액세서리 딜 분류", 1),
            ("생활/주방", "생활용품, 주방용품, 청소용품 딜 분류", 2),
            ("식품/건강", "식품, 음료, 건강기능식품 딜 분류", 3),
        ]
        for name, description, sort_order in category_specs:
            HotdealCategory.objects.get_or_create(
                slug=name,
                defaults={
                    "name": name,
                    "description": description,
                    "sort_order": sort_order,
                    "is_visible": True,
                },
            )
        first_category = HotdealCategory.objects.order_by("sort_order", "id").first()
        if first_category:
            Hotdeal.objects.filter(category__isnull=True).update(category=first_category)

    def _ensure_marketplace_categories(self):
        """중고장터 좌측 메뉴에 노출할 기본 카테고리를 생성한다.

        [운영 정책]
        - marketplace_marketplacecategory 는 운영 데이터 (menu_placement, is_visible, sort_order 등 admin 관리).
        - 이미 데이터 존재 시 bootstrap 이 UPDATE 하지 않음.
        """
        if MarketplaceCategory.objects.exists():
            self.stdout.write(
                self.style.WARNING("[중고장터카테고리] 운영 데이터 존재 → bootstrap marketplace categories 스킵 (Admin 설정 유지)")
            )
            return

        category_specs = [
            ("디지털기기", "노트북, 태블릿, 휴대폰, 주변기기 거래 분류", 0),
            ("가전", "생활가전과 주방가전 거래 분류", 1),
            ("스포츠/레저", "골프, 자전거, 캠핑 등 취미용품 거래 분류", 2),
            ("패션/잡화", "의류, 신발, 가방, 시계 거래 분류", 3),
        ]
        for name, description, sort_order in category_specs:
            MarketplaceCategory.objects.get_or_create(
                slug=name,
                defaults={
                    "name": name,
                    "description": description,
                    "sort_order": sort_order,
                    "is_visible": True,
                },
            )
        first_category = MarketplaceCategory.objects.order_by("sort_order", "id").first()
        if first_category:
            MarketplaceItem.objects.filter(category__isnull=True).update(category=first_category)

    def _ensure_test_account_passwords(self):
        """Test 계정(admin, buy, sell)의 비밀번호를 문서화된 값으로 강제 보장.

        myppl-backend-temp 같은 개발/테스트 환경에서 로그인 페이지에 안내된 계정으로
        항상 로그인할 수 있게 한다. (운영 중인 실제 회원 비번은 절대 변경하지 않음)
        bootstrap 이 실행될 때마다 (또는 one-off으로 호출될 때) 보장된다.
        """
        user_model = get_user_model()
        test_accounts = [
            ("admin", "admin"),
            ("buy", "buy"),
            ("sell", "sell"),
        ]
        for username, password in test_accounts:
            try:
                user = user_model.objects.get(username=username)
                user.set_password(password)
                user.save(update_fields=["password"])
                self.stdout.write(self.style.SUCCESS(f"[TEST ACCOUNT] {username} 비밀번호를 '{password}'(으)로 강제 설정했습니다."))
            except user_model.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"[TEST ACCOUNT] {username} 계정이 DB에 없습니다 (생성되지 않음)."))

    def _ensure_hero_slides(self):
        """히어로 슬라이드 초기 생성 (빈 경우에만).

        운영 중인 DB에서는 Admin panel이 원본.
        bootstrap은 최초 설치 시에만 hero 슬라이드를 생성한다.
        (이미지 파일은 media volume에 있어야 함. seed 이미지나 수동 업로드된 파일.)
        """
        if HomeHeroSlide.objects.exists():
            self.stdout.write(
                self.style.WARNING("[히어로] 운영 데이터 존재 → bootstrap hero 스킵 (Admin 설정 유지)")
            )
            return

        # hero_specs는 dump_bootstrap_specs 로 admin에서 export 한 현재 상태를 여기에 붙여넣거나 --bless 로 업데이트.
        # 여기서는 예시로 seed 값 (실제 적용 시 admin export 결과로 교체).
        hero_specs = [
            {
                "title": "오늘의 특가",
                "description": "지금 가장 인기 있는 할인 상품을 빠르게 확인하세요.",
                "badge": "",
                "href": "https://myppl.co.kr/",
                "image": "catalog/home-hero-slides/hero-seed-1.png",
                "display_seconds": 4,
                "transition_style": "fade",
                "sort_order": 0,
                "is_active": True,
            },
            {
                "title": "신상 모아보기",
                "description": "카테고리별 신상품을 한 번에 비교해 보세요.",
                "badge": "",
                "href": "https://myppl.co.kr/products",
                "image": "catalog/home-hero-slides/hero-seed-2.png",
                "display_seconds": 4,
                "transition_style": "slide_lr",
                "sort_order": 1,
                "is_active": True,
            },
            {
                "title": "중고장터 추천",
                "description": "검증된 판매자 상품을 안전하게 둘러보세요.",
                "badge": "",
                "href": "https://myppl.co.kr/products?market=used",
                "image": "catalog/home-hero-slides/hero-seed-3.png",
                "display_seconds": 4,
                "transition_style": "zoom",
                "sort_order": 2,
                "is_active": True,
            },
            {
                "title": "커뮤니티 실시간",
                "description": "구매자·판매자 커뮤니티 인기글을 놓치지 마세요.",
                "badge": "",
                "href": "https://myppl.co.kr/buyer-community",
                "image": "catalog/home-hero-slides/hero-seed-4.png",
                "display_seconds": 4,
                "transition_style": "wipe",
                "sort_order": 3,
                "is_active": True,
            },
        ]

        for spec in hero_specs:
            slide, created = HomeHeroSlide.objects.get_or_create(
                title=spec["title"],
                defaults={
                    "description": spec.get("description", ""),
                    "badge": spec.get("badge", ""),
                    "href": spec.get("href", ""),
                    "image": spec.get("image", ""),
                    "display_seconds": spec.get("display_seconds", 4),
                    "transition_style": spec.get("transition_style", "fade"),
                    "sort_order": spec.get("sort_order", 0),
                    "is_active": spec.get("is_active", True),
                },
            )
            if created:
                self.stdout.write(f"[히어로] {slide.title} 생성 (image: {spec.get('image')})")
            else:
                self.stdout.write(f"[히어로] {slide.title} 이미 존재")
