from django.conf import settings
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey


def default_board_writer_roles():
    return ["all"]


class Board(models.Model):
    """게시판 메타 정보."""

    BOARD_GENERAL = "general"
    BOARD_HOTDEAL = "hotdeal"
    BOARD_MARKETPLACE = "marketplace"
    BOARD_NOTICE = "notice"
    BOARD_PRODUCT = "product"
    BOARD_TYPE_CHOICES = [
        (BOARD_GENERAL, "일반"),
        (BOARD_PRODUCT, "상품게시판"),
        (BOARD_HOTDEAL, "핫딜"),
        (BOARD_MARKETPLACE, "중고장터"),
        (BOARD_NOTICE, "공지"),
    ]
    PRODUCT_BOARD_STANDARD = "standard"
    PRODUCT_BOARD_LIVE_SPECIAL = "live_special"
    PRODUCT_BOARD_TYPE_CHOICES = [
        (PRODUCT_BOARD_STANDARD, "일반 상품"),
        (PRODUCT_BOARD_LIVE_SPECIAL, "라이브특가"),
    ]
    READ_PUBLIC = "public"
    READ_MEMBER = "member"
    READ_GRADE = "grade"
    READ_PERMISSION_CHOICES = [
        (READ_PUBLIC, "전체공개"),
        (READ_MEMBER, "회원전용"),
        (READ_GRADE, "등급제한"),
    ]
    AUDIENCE_ALL = "all"
    AUDIENCE_BUYER = "buyer"
    AUDIENCE_SELLER = "seller"
    AUDIENCE_CHOICES = [
        (AUDIENCE_ALL, "공통"),
        (AUDIENCE_BUYER, "구매자"),
        (AUDIENCE_SELLER, "판매자"),
    ]
    WRITER_ALL = "all"
    WRITER_BUYER = "buyer"
    WRITER_SELLER = "seller"
    WRITER_ADMIN = "admin"
    WRITER_ROLE_CHOICES = [
        (WRITER_ALL, "모두"),
        (WRITER_BUYER, "구매자"),
        (WRITER_SELLER, "판매자"),
        (WRITER_ADMIN, "관리자"),
    ]

    name = models.CharField("게시판 이름", max_length=100)
    slug = models.SlugField("게시판 슬러그", unique=True)
    parent = models.ForeignKey("self", related_name="children", null=True, blank=True, on_delete=models.CASCADE)
    board_type = models.CharField("게시판 종류", max_length=20, choices=BOARD_TYPE_CHOICES, default=BOARD_GENERAL)
    product_board_type = models.CharField(
        "상품게시판 옵션",
        max_length=20,
        choices=PRODUCT_BOARD_TYPE_CHOICES,
        default=PRODUCT_BOARD_STANDARD,
    )
    audience = models.CharField("대상 회원", max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_ALL)
    description = models.TextField("게시판 설명", blank=True)
    icon = models.CharField("게시판 아이콘", max_length=10, blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_visible = models.BooleanField("공개 여부", default=True)
    show_in_top_menu = models.BooleanField("탑 메뉴 노출 여부", default=False)
    min_grade = models.CharField("읽기 최소 등급", max_length=20, default="seed")
    write_grade = models.CharField("쓰기 최소 등급", max_length=20, default="member")
    allowed_writer_roles = models.JSONField("글쓰기 허용 대상", default=default_board_writer_roles, blank=True)
    comment_grade = models.CharField("댓글 최소 등급", max_length=20, default="member")
    read_permission = models.CharField("읽기 권한", max_length=20, choices=READ_PERMISSION_CHOICES, default=READ_PUBLIC)
    allow_anonymous = models.BooleanField("비회원 읽기 허용", default=True)
    allow_anonymous_post = models.BooleanField("익명글 허용", default=False)
    allow_file_upload = models.BooleanField("파일 첨부 허용", default=True)
    use_category = models.BooleanField("말머리 사용", default=False)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.name

    @property
    def has_children(self) -> bool:
        return self.children.exists()

    def normalized_allowed_writer_roles(self) -> list[str]:
        allowed_values = {value for value, _label in self.WRITER_ROLE_CHOICES}
        roles = self.allowed_writer_roles if isinstance(self.allowed_writer_roles, list) else []
        normalized = []
        for role in roles:
            if role in allowed_values and role not in normalized:
                normalized.append(role)
        if not normalized or self.WRITER_ALL in normalized:
            return [self.WRITER_ALL]
        return normalized

    def can_user_write(self, user) -> bool:
        if not user or not user.is_authenticated:
            return False

        roles = self.normalized_allowed_writer_roles()
        if self.WRITER_ALL in roles:
            return True

        operator_role = getattr(user, "operator_role", "")
        if self.WRITER_ADMIN in roles and operator_role in {"moderator", "admin", "superadmin"}:
            return True

        member_type = getattr(user, "member_type", "")
        if self.WRITER_BUYER in roles and member_type == self.WRITER_BUYER:
            return True
        if self.WRITER_SELLER in roles and member_type == self.WRITER_SELLER:
            return True
        return False


class Post(models.Model):
    """게시글 모델."""

    NOTICE_GLOBAL = "global"
    NOTICE_BOARD = "board"
    NOTICE_TYPE_CHOICES = [
        (NOTICE_GLOBAL, "전체공지"),
        (NOTICE_BOARD, "게시판공지"),
    ]
    LIVE_STATUS_SCHEDULED = "scheduled"
    LIVE_STATUS_ON_AIR = "on_air"
    LIVE_STATUS_ENDED = "ended"
    LIVE_STATUS_REPLAY = "replay"
    LIVE_STATUS_CHOICES = [
        (LIVE_STATUS_SCHEDULED, "예정"),
        (LIVE_STATUS_ON_AIR, "진행중"),
        (LIVE_STATUS_ENDED, "종료"),
        (LIVE_STATUS_REPLAY, "다시보기"),
    ]

    board = models.ForeignKey(Board, related_name="posts", on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="posts", on_delete=models.CASCADE)
    title = models.CharField("제목", max_length=200)
    content = models.TextField("본문")
    product_original_price = models.DecimalField("상품 원래가격", max_digits=12, decimal_places=0, null=True, blank=True)
    product_sale_price = models.DecimalField("상품 현재가격", max_digits=12, decimal_places=0, null=True, blank=True)
    product_live_url = models.URLField("상품 라이브 방송 링크", max_length=500, blank=True)
    product_store_name = models.CharField("해당 쇼핑몰 이름", max_length=80, blank=True)
    product_live_platform = models.CharField("라이브 방송 플랫폼", max_length=80, blank=True)
    product_live_channel = models.CharField("라이브 방송 채널명", max_length=100, blank=True)
    product_live_starts_at = models.DateTimeField("라이브 방송 시작일시", null=True, blank=True)
    product_live_ends_at = models.DateTimeField("라이브 방송 종료일시", null=True, blank=True)
    product_live_status = models.CharField(
        "라이브 방송 상태",
        max_length=20,
        choices=LIVE_STATUS_CHOICES,
        default=LIVE_STATUS_SCHEDULED,
        blank=True,
    )
    product_live_benefit = models.CharField("라이브 방송 혜택 문구", max_length=200, blank=True)
    product_live_button_label = models.CharField("라이브 방송 버튼 문구", max_length=40, default="라이브 보기", blank=True)
    views = models.PositiveIntegerField("조회수", default=0)
    likes = models.PositiveIntegerField("추천수", default=0)
    is_notice = models.BooleanField("공지 여부", default=False)
    notice_type = models.CharField("공지 타입", max_length=20, choices=NOTICE_TYPE_CHOICES, blank=True)
    notice_start = models.DateTimeField("공지 시작일", null=True, blank=True)
    notice_end = models.DateTimeField("공지 종료일", null=True, blank=True)
    notice_order = models.PositiveIntegerField("공지 정렬 순서", default=0)
    is_deleted = models.BooleanField("임시 삭제 여부", default=False)
    is_blinded = models.BooleanField("블라인드 여부", default=False)
    blind_reason = models.CharField("블라인드 사유", max_length=200, blank=True)
    deleted_at = models.DateTimeField("삭제일", null=True, blank=True)
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="deleted_posts", on_delete=models.SET_NULL)
    moved_from_board_name = models.CharField("이동 전 게시판명", max_length=100, blank=True)
    created_at = models.DateTimeField("작성일", auto_now_add=True)
    updated_at = models.DateTimeField("수정일", auto_now=True)

    class Meta:
        ordering = ["-is_notice", "notice_order", "-created_at", "-id"]

    def __str__(self) -> str:
        return self.title


class PostImage(models.Model):
    """게시글 첨부 이미지."""

    post = models.ForeignKey(Post, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField("이미지", upload_to="posts/")
    created_at = models.DateTimeField("생성일", auto_now_add=True)


class PostLike(models.Model):
    """중복 추천 방지를 위한 게시글 추천 이력."""

    post = models.ForeignKey(Post, related_name="post_likes", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="post_likes", on_delete=models.CASCADE)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        unique_together = ("post", "user")


class Comment(MPTTModel):
    """대댓글을 지원하는 댓글 모델."""

    post = models.ForeignKey(Post, related_name="comments", on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="comments", on_delete=models.CASCADE)
    content = models.TextField("댓글 내용")
    is_secret = models.BooleanField("비밀댓글 여부", default=False)
    parent = TreeForeignKey(
        "self",
        related_name="children",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    created_at = models.DateTimeField("작성일", auto_now_add=True)

    class MPTTMeta:
        order_insertion_by = ["created_at"]

    def __str__(self) -> str:
        return f"{self.author} - {self.content[:20]}"


class Report(models.Model):
    """게시글/댓글 신고 모델."""

    STATUS_PENDING = "pending"
    STATUS_RESOLVED = "resolved"
    STATUS_DISMISSED = "dismissed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "처리대기"),
        (STATUS_RESOLVED, "처리완료"),
        (STATUS_DISMISSED, "기각"),
    ]
    REASON_SPAM = "spam"
    REASON_ABUSE = "abuse"
    REASON_ADULT = "adult"
    REASON_PRIVATE = "private"
    REASON_COPYRIGHT = "copyright"
    REASON_OTHER = "other"
    REASON_CHOICES = [
        (REASON_SPAM, "스팸/광고"),
        (REASON_ABUSE, "욕설/비방"),
        (REASON_ADULT, "음란물"),
        (REASON_PRIVATE, "개인정보"),
        (REASON_COPYRIGHT, "저작권"),
        (REASON_OTHER, "기타"),
    ]

    post = models.ForeignKey(Post, related_name="reports", null=True, blank=True, on_delete=models.CASCADE)
    comment = models.ForeignKey(Comment, related_name="reports", null=True, blank=True, on_delete=models.CASCADE)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="my_reports", on_delete=models.CASCADE)
    reason = models.CharField("신고 사유", max_length=20, choices=REASON_CHOICES)
    detail = models.TextField("신고 상세", blank=True)
    status = models.CharField("처리 상태", max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    handled_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="handled_reports", on_delete=models.SET_NULL)
    handled_note = models.TextField("처리 메모", blank=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)
    handled_at = models.DateTimeField("처리일", null=True, blank=True)

    class Meta:
        ordering = ["status", "-created_at", "-id"]

    def __str__(self) -> str:
        target = f"post:{self.post_id}" if self.post_id else f"comment:{self.comment_id}"
        return f"{target} - {self.reason}"


class KeywordFilter(models.Model):
    """운영자 금칙어 필터."""

    FILTER_EXACT = "exact"
    FILTER_CONTAINS = "contains"
    FILTER_REGEX = "regex"
    FILTER_TYPE_CHOICES = [
        (FILTER_EXACT, "완전일치"),
        (FILTER_CONTAINS, "포함"),
        (FILTER_REGEX, "정규식"),
    ]
    ACTION_BLOCK = "block"
    ACTION_REPLACE = "replace"
    ACTION_FLAG = "flag"
    ACTION_CHOICES = [
        (ACTION_BLOCK, "게시 차단"),
        (ACTION_REPLACE, "치환"),
        (ACTION_FLAG, "검토 필요"),
    ]
    TARGET_ALL = "all"
    TARGET_POST = "post"
    TARGET_COMMENT = "comment"
    TARGET_NICKNAME = "nickname"
    TARGET_CHOICES = [
        (TARGET_ALL, "전체"),
        (TARGET_POST, "게시글"),
        (TARGET_COMMENT, "댓글"),
        (TARGET_NICKNAME, "닉네임"),
    ]

    keyword = models.CharField("키워드", max_length=100)
    filter_type = models.CharField("필터 타입", max_length=20, choices=FILTER_TYPE_CHOICES, default=FILTER_CONTAINS)
    action = models.CharField("처리 방식", max_length=20, choices=ACTION_CHOICES, default=ACTION_BLOCK)
    target = models.CharField("대상", max_length=20, choices=TARGET_CHOICES, default=TARGET_ALL)
    is_active = models.BooleanField("활성 여부", default=True)
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return self.keyword


class SearchKeywordStat(models.Model):
    """통합검색에서 입력된 키워드 집계."""

    keyword = models.CharField("검색어", max_length=100, unique=True)
    search_count = models.PositiveIntegerField("검색 횟수", default=1)
    last_searched_at = models.DateTimeField("최근 검색 시각")
    created_at = models.DateTimeField("생성일", auto_now_add=True)

    class Meta:
        ordering = ["-search_count", "-last_searched_at", "keyword"]

    def __str__(self) -> str:
        return self.keyword
