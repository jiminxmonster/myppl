import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.boards.models import Board, Post, Comment
from apps.catalog.models import ProductCategory, Product
from apps.hotdeals.models import Hotdeal, HotdealCategory
from apps.marketplace.models import MarketplaceItem, MarketplaceCategory
# Faker optional - if not installed, use simple random data
try:
    from faker import Faker
    fake = Faker('ko_KR')
    HAS_FAKER = True
except ImportError:
    HAS_FAKER = False
    fake = None

class Command(BaseCommand):
    help = "대량 현실적인 테스트 데이터 생성 (운영 DB 기준, bootstrap과 별도)"

    def add_arguments(self, parser):
        parser.add_argument('--products', type=int, default=500, help='상품 수')
        parser.add_argument('--posts', type=int, default=1000, help='게시글 수')
        parser.add_argument('--comments', type=int, default=3000, help='댓글 수')
        parser.add_argument('--clear', action='store_true', help='기존 샘플 데이터 삭제 후 생성 (주의: 운영 데이터 아님)')

    def handle(self, *args, **options):
        User = get_user_model()
        products_count = options['products']
        posts_count = options['posts']
        comments_count = options['comments']

        if options['clear']:
            self.stdout.write("기존 샘플 데이터 삭제 중...")
            Hotdeal.objects.all().delete()
            MarketplaceItem.objects.all().delete()
            Post.objects.filter(title__startswith="샘플").delete()  # 샘플만
            self.stdout.write("삭제 완료")

        # 기본 데이터 가져오기 (bootstrap으로 생성된 것들)
        categories = list(ProductCategory.objects.filter(is_active=True))
        boards = list(Board.objects.filter(is_visible=True))
        hotdeal_cats = list(HotdealCategory.objects.all())
        market_cats = list(MarketplaceCategory.objects.all())
        users = list(User.objects.all()[:50])  # 기존 유저 사용

        if not categories or not boards or not users:
            self.stdout.write(self.style.ERROR("기본 데이터 (카테고리, 게시판, 유저)가 부족합니다. bootstrap 먼저 실행하세요."))
            return

        self.stdout.write(f"상품 {products_count}개 생성 시작...")
        for i in range(products_count):
            cat = random.choice(categories)
            price = Decimal(random.randint(10000, 1000000))
            product = Product.objects.create(
                name=fake.word() + " " + fake.word(),
                description=fake.text(max_nb_chars=200),
                price=price,
                sale_price=price * Decimal('0.8') if random.random() > 0.3 else price,
                category=cat,
                is_active=True,
                created_by=random.choice(users),
            )
            if i % 100 == 0:
                self.stdout.write(f"  상품 {i}개 생성됨")

        self.stdout.write(f"게시글 {posts_count}개 생성 시작...")
        for i in range(posts_count):
            board = random.choice(boards)
            author = random.choice(users)
            post = Post.objects.create(
                board=board,
                author=author,
                title=fake.sentence(),
                content=fake.text(max_nb_chars=500),
                views=random.randint(0, 10000),
                likes=random.randint(0, 500),
                created_at=timezone.now() - timezone.timedelta(days=random.randint(0, 365)),
            )
            if i % 200 == 0:
                self.stdout.write(f"  게시글 {i}개 생성됨")

        self.stdout.write(f"댓글 {comments_count}개 생성 시작...")
        posts = list(Post.objects.all()[:posts_count])  # 방금 만든 것들
        for i in range(comments_count):
            post = random.choice(posts)
            author = random.choice(users)
            Comment.objects.create(
                post=post,
                author=author,
                content=fake.text(max_nb_chars=100),
                created_at=timezone.now() - timezone.timedelta(days=random.randint(0, 30)),
            )
            if i % 500 == 0:
                self.stdout.write(f"  댓글 {i}개 생성됨")

        # Hotdeal 추가
        if hotdeal_cats:
            self.stdout.write("핫딜 추가...")
            for _ in range(100):
                Hotdeal.objects.create(
                    title=fake.sentence(),
                    description=fake.text(),
                    category=random.choice(hotdeal_cats),
                    source_url=fake.url(),
                    original_price=Decimal(random.randint(10000, 500000)),
                    sale_price=Decimal(random.randint(5000, 400000)),
                    expires_at=timezone.now() + timezone.timedelta(days=random.randint(1, 30)),
                    status='active',
                    author=random.choice(users),
                )

        # Marketplace 추가
        if market_cats:
            self.stdout.write("중고장터 아이템 추가...")
            for _ in range(100):
                MarketplaceItem.objects.create(
                    title=fake.sentence(),
                    description=fake.text(),
                    category=random.choice(market_cats),
                    price=Decimal(random.randint(10000, 300000)),
                    region=fake.city(),
                    author=random.choice(users),
                    status='onsale',
                    approval_status='approved',
                )

        self.stdout.write(self.style.SUCCESS(f"대량 데이터 생성 완료! 상품~{products_count}, 게시글~{posts_count}, 댓글~{comments_count}"))
