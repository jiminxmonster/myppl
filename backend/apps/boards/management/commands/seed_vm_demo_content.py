from decimal import Decimal
import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.boards.models import Board, Comment, Post
from apps.hotdeals.models import Hotdeal, HotdealCategory
from apps.marketplace.models import MarketplaceCategory, MarketplaceItem


class Command(BaseCommand):
    help = "VM 검수용 데모 콘텐츠를 기존 데이터 삭제 없이 추가합니다."

    def add_arguments(self, parser):
        parser.add_argument("--posts", type=int, default=60)
        parser.add_argument("--comments", type=int, default=180)
        parser.add_argument("--hotdeals", type=int, default=30)
        parser.add_argument("--market", type=int, default=30)
        parser.add_argument("--users", type=int, default=12)

    def handle(self, *args, **options):
        rng = random.Random(20260614)
        users = self._ensure_users(options["users"])
        boards = list(Board.objects.filter(is_visible=True).order_by("sort_order", "id"))
        if not boards:
            self.stderr.write(self.style.ERROR("공개 게시판이 없습니다. Admin에서 게시판을 먼저 생성하세요."))
            return

        hotdeal_categories = list(HotdealCategory.objects.filter(is_visible=True).order_by("sort_order", "id"))
        market_categories = list(MarketplaceCategory.objects.filter(is_visible=True).order_by("sort_order", "id"))

        posts = self._create_posts(boards, users, options["posts"], rng)
        self._create_comments(posts, users, options["comments"], rng)
        self._create_hotdeals(hotdeal_categories, users, options["hotdeals"], rng)
        self._create_market_items(market_categories, users, options["market"], rng)

        self.stdout.write(
            self.style.SUCCESS(
                f"데모 데이터 추가 완료: users={len(users)}, posts={len(posts)}, "
                f"comments={options['comments']}, hotdeals={options['hotdeals']}, market={options['market']}"
            )
        )

    def _ensure_users(self, count):
        user_model = get_user_model()
        users = []
        for index in range(1, count + 1):
            member_type = "seller" if index % 2 else "buyer"
            username = f"demo_{member_type}_{index:02d}"
            user, created = user_model.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@myppl.local",
                    "nickname": f"{'판매자' if member_type == 'seller' else '구매자'}{index:02d}",
                    "member_type": member_type,
                    "grade": "member",
                    "operator_role": "none",
                    "is_active": True,
                },
            )
            if created:
                user.set_password("demo1234")
                user.save(update_fields=["password"])
            users.append(user)
        return users

    def _create_posts(self, boards, users, count, rng):
        title_pool = [
            "오늘 써본 상품 중 만족도 높았던 것",
            "가격 대비 괜찮은 구성 공유합니다",
            "실사용 후기와 구매 전 체크 포인트",
            "이번 주 눈에 띄는 상품 모음",
            "배송 빠르고 포장 괜찮았던 제품",
            "비슷한 제품 비교해보고 고른 이유",
            "사무실에서 쓰기 좋은 아이템",
            "가족 선물용으로 괜찮은 제품",
            "생활비 줄이는 데 도움된 구매",
            "재구매 의사 있는 상품 후기",
        ]
        content_pool = [
            "직접 써보니 사진보다 마감이 괜찮고, 가격대 대비 구성도 나쁘지 않았습니다. 구매 전에는 옵션과 배송비를 같이 확인하는 편이 좋겠습니다.",
            "동일 카테고리 상품을 몇 개 비교해봤는데 이 제품은 할인 폭과 후기 균형이 괜찮았습니다. 실사용 기준으로 장단점을 정리해봅니다.",
            "처음에는 큰 기대를 하지 않았는데 일주일 정도 사용해보니 만족도가 높았습니다. 특히 설치나 초기 설정이 간단한 점이 좋았습니다.",
            "가격 변동이 꽤 있는 상품이라 알림을 걸어두고 보는 게 좋습니다. 오늘 기준으로는 체감가가 괜찮은 편입니다.",
        ]
        posts = []
        for index in range(count):
            board = boards[index % len(boards)]
            author = users[index % len(users)]
            is_product_board = board.board_type == Board.BOARD_PRODUCT
            original_price = Decimal(rng.randrange(49000, 380000, 1000)) if is_product_board else None
            sale_price = (original_price * Decimal(rng.choice(["0.55", "0.62", "0.70", "0.78"]))).quantize(Decimal("1")) if original_price else None
            post = Post.objects.create(
                board=board,
                author=author,
                title=f"[샘플] {title_pool[index % len(title_pool)]} {index + 1}",
                content=content_pool[index % len(content_pool)],
                product_original_price=original_price,
                product_sale_price=sale_price,
                product_store_name=rng.choice(["MYPPL 셀러", "오픈마켓", "브랜드스토어", "동네상점"]) if is_product_board else "",
                views=rng.randint(35, 4200),
                likes=rng.randint(0, 280),
                created_at=timezone.now() - timezone.timedelta(hours=rng.randint(1, 360)),
            )
            posts.append(post)
        return posts

    def _create_comments(self, posts, users, count, rng):
        if not posts:
            return
        comments = [
            "정보 감사합니다. 옵션 확인해봐야겠네요.",
            "이 가격이면 괜찮아 보입니다.",
            "배송비 포함 가격도 확인해보면 좋겠습니다.",
            "저도 비슷한 제품 쓰는데 만족합니다.",
            "후기 더 올라오면 비교해봐야겠네요.",
            "알림 설정해두고 가격 변동 보겠습니다.",
        ]
        for index in range(count):
            Comment.objects.create(
                post=posts[index % len(posts)],
                author=users[(index + 3) % len(users)],
                content=comments[index % len(comments)],
                is_secret=False,
            )

    def _create_hotdeals(self, categories, users, count, rng):
        if not categories:
            return
        names = ["무선 이어폰", "공기청정기", "키보드", "스니커즈", "단백질 음료", "토스터", "백팩", "모니터"]
        for index in range(count):
            original = Decimal(rng.randrange(39000, 690000, 1000))
            sale = (original * Decimal(rng.choice(["0.48", "0.57", "0.66", "0.74"]))).quantize(Decimal("1"))
            Hotdeal.objects.create(
                title=f"[샘플핫딜] {names[index % len(names)]} 특가 {index + 1}",
                description="검수용 샘플 핫딜입니다. 실제 운영 전 Admin에서 수정 또는 삭제 가능합니다.",
                author=users[index % len(users)],
                category=categories[index % len(categories)],
                source_url="https://www.myppl.co.kr",
                original_price=original,
                sale_price=sale,
                view_count=rng.randint(80, 5000),
                expires_at=timezone.now() + timezone.timedelta(days=rng.randint(1, 21)),
                status=Hotdeal.STATUS_ACTIVE,
            )

    def _create_market_items(self, categories, users, count, rng):
        if not categories:
            return
        names = ["태블릿", "카메라", "캠핑의자", "러닝화", "에어프라이어", "토트백", "스마트워치", "미니빔"]
        for index in range(count):
            original = Decimal(rng.randrange(80000, 980000, 1000))
            price = (original * Decimal(rng.choice(["0.35", "0.42", "0.50", "0.63"]))).quantize(Decimal("1"))
            category = categories[index % len(categories)]
            MarketplaceItem.objects.create(
                title=f"[샘플상품] {names[index % len(names)]} 판매 {index + 1}",
                description="검수용 샘플 판매상품입니다. 이미지와 옵션은 Admin에서 교체 가능합니다.",
                author=users[(index + 2) % len(users)],
                category=category,
                original_price=original,
                price=price,
                view_count=rng.randint(60, 4300),
                region=rng.choice(["서울", "경기", "부산", "대구", "인천", "광주"]),
                status=MarketplaceItem.STATUS_ONSALE,
                approval_status=MarketplaceItem.APPROVAL_APPROVED,
                menu_placement=category.menu_placement
                if category.menu_placement in {MarketplaceItem.MENU_PLACEMENT_SALE, MarketplaceItem.MENU_PLACEMENT_USED}
                else rng.choice([MarketplaceItem.MENU_PLACEMENT_SALE, MarketplaceItem.MENU_PLACEMENT_USED]),
                is_negotiable=bool(index % 3 == 0),
            )
