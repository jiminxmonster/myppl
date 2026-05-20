from urllib.error import URLError
from urllib.request import Request, urlopen

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.boards.models import Board, Post, PostImage


IMAGE_WIDTH = 900
IMAGE_QUALITY = 82
UNSPLASH_URL = "https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w={width}&q={quality}"


def unsplash(photo_id: str) -> str:
    return UNSPLASH_URL.format(photo_id=photo_id, width=IMAGE_WIDTH, quality=IMAGE_QUALITY)


SAMPLE_BOARD_POSTS = {
    "live-special": [
        {
            "title": "네이버 라이브 무선청소기 특가",
            "store_name": "네이버쇼핑",
            "link": "https://shoppinglive.naver.com/home",
            "platform": "네이버",
            "views": 330,
            "image": unsplash("1558618666-fcd25c85cd64"),
        },
        {
            "title": "프리미엄 홈카페 머신 라이브",
            "store_name": "롯데온",
            "link": "https://www.lotteon.com/",
            "platform": "롯데온",
            "views": 310,
            "image": unsplash("1495474472287-4d71bcdd2085"),
        },
        {
            "title": "제주 과일 선물세트 방송특가",
            "store_name": "쿠팡",
            "link": "https://www.coupang.com/np/campaigns/82",
            "platform": "쿠팡",
            "views": 290,
            "image": unsplash("1619566636858-adf3ef46400b"),
        },
        {
            "title": "온열매트 겨울준비 라이브",
            "store_name": "오늘의집",
            "link": "https://ohou.se/",
            "platform": "오늘의집",
            "views": 270,
            "image": unsplash("1505693416388-ac5ce068fe85"),
        },
        {
            "title": "로봇청소기 스마트홈 한정가",
            "store_name": "네이버쇼핑",
            "link": "https://shoppinglive.naver.com/home",
            "platform": "네이버",
            "views": 250,
            "image": unsplash("1556228453-efd6c1ff04f6"),
        },
        {
            "title": "대용량 세탁세제 묶음 라이브",
            "store_name": "G마켓",
            "link": "https://www.gmarket.co.kr/",
            "platform": "G마켓",
            "views": 230,
            "image": unsplash("1526947425960-945c6e72858f"),
        },
        {
            "title": "트래블 캐리어 패키지 특가",
            "store_name": "11번가",
            "link": "https://www.11st.co.kr/",
            "platform": "11번가",
            "views": 210,
            "image": unsplash("1565026057447-bc90a3dceb87"),
        },
        {
            "title": "스포츠워치 건강관리 라이브",
            "store_name": "SSG",
            "link": "https://www.ssg.com/",
            "platform": "SSG",
            "views": 190,
            "image": unsplash("1523275335684-37898b6baf30"),
        },
        {
            "title": "유아 그림책 전집 라이브 혜택",
            "store_name": "교보문고",
            "link": "https://www.kyobobook.co.kr/",
            "platform": "교보문고",
            "views": 170,
            "image": unsplash("1512820790803-83ca734da794"),
        },
        {
            "title": "반려동물 자동급식기 특가",
            "store_name": "쿠팡",
            "link": "https://www.coupang.com/",
            "platform": "쿠팡",
            "views": 150,
            "image": unsplash("1601758125946-6ec2ef64daf8"),
        },
        {
            "title": "프리미엄 식기세트 홈쇼핑가",
            "store_name": "롯데온",
            "link": "https://www.lotteon.com/",
            "platform": "롯데온",
            "views": 130,
            "image": unsplash("1556911220-bff31c812dba"),
        },
        {
            "title": "노트북 주변기기 패키지 방송",
            "store_name": "네이버 스마트스토어",
            "link": "https://smartstore.naver.com/",
            "platform": "네이버",
            "views": 110,
            "image": unsplash("1496181133206-80ce9b88a853"),
        },
    ],
    "seller-hot-issues": [
        {
            "title": "판매자 추천 무선 이어폰 핫딜",
            "store_name": "쿠팡",
            "link": "https://www.coupang.com/",
            "views": 330,
            "image": unsplash("1606220945770-b5b6c2c55bf1"),
        },
        {
            "title": "셀러 직송 게이밍 노트북",
            "store_name": "G마켓",
            "link": "https://www.gmarket.co.kr/",
            "views": 310,
            "image": unsplash("1517336714731-489689fd1ca8"),
        },
        {
            "title": "브랜드 의류 시즌오프",
            "store_name": "무신사",
            "link": "https://www.musinsa.com/",
            "views": 290,
            "image": unsplash("1445205170230-053b83016050"),
        },
        {
            "title": "주방 수납 정리세트",
            "store_name": "오늘의집",
            "link": "https://ohou.se/",
            "views": 270,
            "image": unsplash("1556911220-bff31c812dba"),
        },
        {
            "title": "친환경 세제 대용량 구성",
            "store_name": "11번가",
            "link": "https://www.11st.co.kr/",
            "views": 250,
            "image": unsplash("1526947425960-945c6e72858f"),
        },
        {
            "title": "홈트레이닝 덤벨 패키지",
            "store_name": "SSG",
            "link": "https://www.ssg.com/",
            "views": 230,
            "image": unsplash("1517836357463-d25dfeac3438"),
        },
        {
            "title": "캠핑 테이블 체어 세트",
            "store_name": "네이버쇼핑",
            "link": "https://shopping.naver.com/",
            "views": 210,
            "image": unsplash("1504280390367-361c6d9f38f4"),
        },
        {
            "title": "프리미엄 침구 풀세트",
            "store_name": "오늘의집",
            "link": "https://ohou.se/",
            "views": 190,
            "image": unsplash("1505693416388-ac5ce068fe85"),
        },
        {
            "title": "스마트 체중계 건강기획",
            "store_name": "올리브영",
            "link": "https://www.oliveyoung.co.kr/",
            "views": 170,
            "image": unsplash("1576675784432-994941412b3d"),
        },
        {
            "title": "디지털 액자 선물세트",
            "store_name": "롯데온",
            "link": "https://www.lotteon.com/",
            "views": 150,
            "image": unsplash("1516035069371-29a1b244cc32"),
        },
        {
            "title": "오피스 키보드 마우스팩",
            "store_name": "네이버 스마트스토어",
            "link": "https://smartstore.naver.com/",
            "views": 130,
            "image": unsplash("1587829741301-dc798b83add3"),
        },
        {
            "title": "차량용 공기청정기 특가",
            "store_name": "쿠팡",
            "link": "https://www.coupang.com/",
            "views": 110,
            "image": unsplash("1503376780353-7e6692767b70"),
        },
    ],
    "community-grid": [
        {
            "title": "커뮤니티 공동구매 키보드",
            "store_name": "네이버 스마트스토어",
            "link": "https://smartstore.naver.com/",
            "views": 330,
            "image": unsplash("1587829741301-dc798b83add3"),
        },
        {
            "title": "동네 추천 과일 꾸러미",
            "store_name": "마켓컬리",
            "link": "https://www.kurly.com/",
            "views": 310,
            "image": unsplash("1619566636858-adf3ef46400b"),
        },
        {
            "title": "회원 추천 캠핑 랜턴",
            "store_name": "쿠팡",
            "link": "https://www.coupang.com/",
            "views": 290,
            "image": unsplash("1504280390367-361c6d9f38f4"),
        },
        {
            "title": "육아맘 추천 보온병",
            "store_name": "SSG",
            "link": "https://www.ssg.com/",
            "views": 270,
            "image": unsplash("1523362628745-0c100150b504"),
        },
        {
            "title": "직장인 추천 텀블러 세트",
            "store_name": "11번가",
            "link": "https://www.11st.co.kr/",
            "views": 250,
            "image": unsplash("1503602642458-232111445657"),
        },
        {
            "title": "홈카페 원두 공동구매",
            "store_name": "쿠팡",
            "link": "https://www.coupang.com/",
            "views": 230,
            "image": unsplash("1495474472287-4d71bcdd2085"),
        },
        {
            "title": "반려가족 추천 리드줄",
            "store_name": "네이버쇼핑",
            "link": "https://shopping.naver.com/",
            "views": 210,
            "image": unsplash("1601758125946-6ec2ef64daf8"),
        },
        {
            "title": "운동모임 추천 매트",
            "store_name": "오늘의집",
            "link": "https://ohou.se/",
            "views": 190,
            "image": unsplash("1517836357463-d25dfeac3438"),
        },
        {
            "title": "독서모임 북스탠드 추천",
            "store_name": "교보문고",
            "link": "https://www.kyobobook.co.kr/",
            "views": 170,
            "image": unsplash("1512820790803-83ca734da794"),
        },
        {
            "title": "취미러 미니 공구세트",
            "store_name": "G마켓",
            "link": "https://www.gmarket.co.kr/",
            "views": 150,
            "image": unsplash("1504148455328-c376907d081c"),
        },
        {
            "title": "집들이 선물 디퓨저",
            "store_name": "올리브영",
            "link": "https://www.oliveyoung.co.kr/",
            "views": 130,
            "image": unsplash("1526947425960-945c6e72858f"),
        },
        {
            "title": "주말장터 수납박스 특가",
            "store_name": "오늘의집",
            "link": "https://ohou.se/",
            "views": 110,
            "image": unsplash("1505693416388-ac5ce068fe85"),
        },
    ],
}


class Command(BaseCommand):
    help = "상품형 샘플 게시글 이미지를 실제 상품 사진처럼 보이는 이미지와 쇼핑몰명으로 갱신합니다."

    def add_arguments(self, parser):
        parser.add_argument("--skip-images", action="store_true", help="이미지 교체 없이 텍스트/순위 데이터만 갱신합니다.")

    def handle(self, *args, **options):
        updated_count = 0
        image_count = 0

        with transaction.atomic():
            for board_slug, samples in SAMPLE_BOARD_POSTS.items():
                board = Board.objects.filter(slug=board_slug).first()
                if board is None:
                    self.stdout.write(self.style.WARNING(f"게시판을 찾을 수 없습니다: {board_slug}"))
                    continue

                for rank, sample in enumerate(samples, start=1):
                    post = Post.objects.filter(board=board, title=sample["title"]).first()
                    if post is None:
                        self.stdout.write(self.style.WARNING(f"샘플 게시글을 찾을 수 없습니다: {board_slug} / {sample['title']}"))
                        continue

                    post.product_store_name = sample["store_name"]
                    post.product_live_url = sample["link"]
                    if board.product_board_type == Board.PRODUCT_BOARD_LIVE_SPECIAL:
                        post.product_live_platform = sample.get("platform", sample["store_name"])
                        post.product_live_status = Post.LIVE_STATUS_ON_AIR if rank <= 3 else Post.LIVE_STATUS_SCHEDULED
                        if post.product_live_starts_at is None:
                            post.product_live_starts_at = timezone.now()
                    post.views = sample["views"]
                    post.save(
                        update_fields=[
                            "product_store_name",
                            "product_live_url",
                            "product_live_platform",
                            "product_live_status",
                            "product_live_starts_at",
                            "views",
                            "updated_at",
                        ]
                    )
                    updated_count += 1

                    if not options["skip_images"] and self._replace_image(post, sample["image"], board_slug, rank):
                        image_count += 1

        self.stdout.write(self.style.SUCCESS(f"샘플 게시글 {updated_count}개 갱신, 이미지 {image_count}개 교체 완료"))

    def _replace_image(self, post: Post, image_url: str, board_slug: str, rank: int) -> bool:
        image_bytes = self._download_image(image_url)
        if image_bytes is None:
            return False

        for post_image in list(post.images.all()):
            post_image.image.delete(save=False)
            post_image.delete()

        image = PostImage(post=post)
        image.image.save(f"{board_slug}-sample-product-{rank:02d}.jpg", ContentFile(image_bytes), save=True)
        return True

    def _download_image(self, image_url: str) -> bytes | None:
        request = Request(image_url, headers={"User-Agent": "myppl-sample-refresh/1.0"})
        try:
            with urlopen(request, timeout=20) as response:
                content_type = response.headers.get("content-type", "")
                if not content_type.startswith("image/"):
                    self.stdout.write(self.style.WARNING(f"이미지 응답이 아닙니다: {image_url} ({content_type})"))
                    return None
                return response.read()
        except (TimeoutError, URLError, OSError) as exc:
            self.stdout.write(self.style.WARNING(f"이미지 다운로드 실패: {image_url} ({exc})"))
            return None
