from django.conf import settings
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey


class Board(models.Model):
    """게시판 메타 정보."""

    BOARD_GENERAL = "general"
    BOARD_HOTDEAL = "hotdeal"
    BOARD_MARKETPLACE = "marketplace"
    BOARD_NOTICE = "notice"
    BOARD_TYPE_CHOICES = [
        (BOARD_GENERAL, "일반"),
        (BOARD_HOTDEAL, "핫딜"),
        (BOARD_MARKETPLACE, "중고장터"),
        (BOARD_NOTICE, "공지"),
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

    name = models.CharField("게시판 이름", max_length=100)
    slug = models.SlugField("게시판 슬러그", unique=True)
    parent = models.ForeignKey("self", related_name="children", null=True, blank=True, on_delete=models.CASCADE)
    board_type = models.CharField("게시판 종류", max_length=20, choices=BOARD_TYPE_CHOICES, default=BOARD_GENERAL)
    audience = models.CharField("대상 회원", max_length=20, choices=AUDIENCE_CHOICES, default=AUDIENCE_ALL)
    description = models.TextField("게시판 설명", blank=True)
    icon = models.CharField("게시판 아이콘", max_length=10, blank=True)
    sort_order = models.PositiveIntegerField("정렬 순서", default=0)
    is_visible = models.BooleanField("공개 여부", default=True)
    show_in_top_menu = models.BooleanField("탑 메뉴 노출 여부", default=False)
    min_grade = models.CharField("읽기 최소 등급", max_length=20, default="seed")
    write_grade = models.CharField("쓰기 최소 등급", max_length=20, default="member")
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


class Post(models.Model):
    """게시글 모델."""

    NOTICE_GLOBAL = "global"
    NOTICE_BOARD = "board"
    NOTICE_TYPE_CHOICES = [
        (NOTICE_GLOBAL, "전체공지"),
        (NOTICE_BOARD, "게시판공지"),
    ]

    board = models.ForeignKey(Board, related_name="posts", on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="posts", on_delete=models.CASCADE)
    title = models.CharField("제목", max_length=200)
    content = models.TextField("본문")
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
