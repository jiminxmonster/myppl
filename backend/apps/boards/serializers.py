from rest_framework import serializers

from .models import Board, Comment, KeywordFilter, Post, PostImage, Report


class BoardSerializer(serializers.ModelSerializer):
    """게시판 목록 응답 직렬화기."""

    parent_id = serializers.IntegerField(source="parent.id", read_only=True)
    child_count = serializers.SerializerMethodField()

    def get_child_count(self, obj):
        return obj.children.count()

    class Meta:
        model = Board
        fields = (
            "id",
            "name",
            "slug",
            "parent_id",
            "board_type",
            "audience",
            "description",
            "show_in_top_menu",
            "child_count",
            "sort_order",
        )


class PostImageSerializer(serializers.ModelSerializer):
    """게시글 이미지 응답 직렬화기."""

    class Meta:
        model = PostImage
        fields = ("id", "image", "created_at")


class CommentSerializer(serializers.ModelSerializer):
    """댓글 트리 응답 직렬화기."""

    author_nickname = serializers.CharField(source="author.nickname", read_only=True)
    children = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()
    can_view_secret = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ("id", "author", "author_nickname", "content", "is_secret", "can_view_secret", "parent", "created_at", "children")
        read_only_fields = ("author",)

    def _can_view_secret(self, obj):
        if not obj.is_secret:
            return True

        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "operator_role", "") in {"moderator", "admin", "superadmin"}:
            return True

        # 비밀댓글은 원글 작성자와 댓글 작성자 본인에게 노출한다.
        return user.id in {obj.post.author_id, obj.author_id}

    def get_can_view_secret(self, obj):
        return self._can_view_secret(obj)

    def get_content(self, obj):
        if self._can_view_secret(obj):
            return obj.content
        return "비밀댓글입니다."

    def get_children(self, obj):
        """대댓글을 재귀적으로 직렬화한다."""
        return CommentSerializer(obj.get_children(), many=True, context=self.context).data


class PostListSerializer(serializers.ModelSerializer):
    """게시글 목록 응답 직렬화기."""

    title = serializers.SerializerMethodField()
    author_nickname = serializers.CharField(source="author.nickname", read_only=True)
    comment_count = serializers.SerializerMethodField()
    thumbnail_image = serializers.SerializerMethodField()
    board_id = serializers.IntegerField(source="board.id", read_only=True)
    board_name = serializers.CharField(source="board.name", read_only=True)
    board_slug = serializers.CharField(source="board.slug", read_only=True)
    board_type = serializers.CharField(source="board.board_type", read_only=True)
    notice_start = serializers.DateTimeField(read_only=True)
    notice_end = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Post
        fields = (
            "id",
            "title",
            "author_nickname",
            "board_id",
            "board_name",
            "board_slug",
            "board_type",
            "thumbnail_image",
            "product_original_price",
            "product_sale_price",
            "is_deleted",
            "is_blinded",
            "is_notice",
            "notice_start",
            "notice_end",
            "views",
            "likes",
            "comment_count",
            "created_at",
        )

    def get_comment_count(self, obj):
        """게시글의 전체 댓글 수를 계산한다."""
        return obj.comments.count()

    def get_title(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        is_operator = bool(
            user
            and user.is_authenticated
            and getattr(user, "operator_role", "") in {"moderator", "admin", "superadmin"}
        )
        if obj.is_blinded and not is_operator:
            return "[블라인드 처리된 게시글]"
        return obj.title

    def get_thumbnail_image(self, obj):
        """첫 번째 첨부 이미지를 목록용 썸네일로 사용한다."""
        first_image = obj.images.first()
        return first_image.image.url if first_image else None


class PostDetailSerializer(serializers.ModelSerializer):
    """게시글 상세 응답 직렬화기."""

    author_nickname = serializers.CharField(source="author.nickname", read_only=True)
    board_type = serializers.CharField(source="board.board_type", read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            "id",
            "board",
            "board_type",
            "author",
            "author_nickname",
            "title",
            "content",
            "product_original_price",
            "product_sale_price",
            "views",
            "likes",
            "is_notice",
            "notice_type",
            "notice_start",
            "notice_end",
            "notice_order",
            "images",
            "comments",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("author", "views", "likes")

    def get_comments(self, obj):
        """최상위 댓글부터 트리 구조로 반환한다."""
        roots = obj.comments.filter(parent__isnull=True)
        return CommentSerializer(roots, many=True, context=self.context).data


class PostWriteSerializer(serializers.ModelSerializer):
    """게시글 생성/수정 직렬화기."""

    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )
    remove_image_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Post
        fields = ("id", "title", "content", "product_original_price", "product_sale_price", "images", "remove_image_ids")

    def to_internal_value(self, data):
        mutable_data = data.copy()
        if hasattr(data, "getlist"):
            remove_values = data.getlist("remove_image_ids")
            if remove_values:
                mutable_data.setlist("remove_image_ids", remove_values)
        for field in ("product_original_price", "product_sale_price"):
            if mutable_data.get(field) == "":
                mutable_data[field] = None
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        """게시글 생성과 함께 첨부 이미지를 저장한다."""
        images = validated_data.pop("images", [])
        validated_data.pop("remove_image_ids", None)
        post = Post.objects.create(**validated_data)
        for image in images:
            PostImage.objects.create(post=post, image=image)
        return post

    def update(self, instance, validated_data):
        """게시글 본문을 수정하고 새 이미지가 오면 추가 저장한다."""
        images = validated_data.pop("images", [])
        remove_image_ids = validated_data.pop("remove_image_ids", [])
        instance.title = validated_data.get("title", instance.title)
        instance.content = validated_data.get("content", instance.content)
        instance.product_original_price = validated_data.get("product_original_price", instance.product_original_price)
        instance.product_sale_price = validated_data.get("product_sale_price", instance.product_sale_price)
        instance.save()
        if remove_image_ids:
            instance.images.filter(id__in=remove_image_ids).delete()
        for image in images:
            PostImage.objects.create(post=instance, image=image)
        return instance


class CommentWriteSerializer(serializers.ModelSerializer):
    """댓글 생성 직렬화기."""

    class Meta:
        model = Comment
        fields = ("id", "content", "parent", "is_secret")


class ReportWriteSerializer(serializers.ModelSerializer):
    """신고 생성 직렬화기."""

    class Meta:
        model = Report
        fields = ("id", "post", "comment", "reason", "detail")

    def validate(self, attrs):
        if not attrs.get("post") and not attrs.get("comment"):
            raise serializers.ValidationError({"detail": "신고 대상이 필요합니다."})
        return attrs


class ReportSerializer(serializers.ModelSerializer):
    """운영자 신고 관리 응답 직렬화기."""

    reporter_nickname = serializers.CharField(source="reporter.nickname", read_only=True)
    handled_by_nickname = serializers.CharField(source="handled_by.nickname", read_only=True)
    post_title = serializers.CharField(source="post.title", read_only=True)
    comment_content = serializers.CharField(source="comment.content", read_only=True)
    pending_count = serializers.IntegerField(read_only=True)
    is_emergency = serializers.BooleanField(read_only=True)

    class Meta:
        model = Report
        fields = (
            "id",
            "post",
            "post_title",
            "comment",
            "comment_content",
            "reporter",
            "reporter_nickname",
            "reason",
            "detail",
            "status",
            "pending_count",
            "is_emergency",
            "handled_by",
            "handled_by_nickname",
            "handled_note",
            "created_at",
            "handled_at",
        )


class KeywordFilterSerializer(serializers.ModelSerializer):
    """운영자 금칙어 관리 직렬화기."""

    class Meta:
        model = KeywordFilter
        fields = ("id", "keyword", "filter_type", "action", "target", "is_active", "created_at")
        read_only_fields = ("created_at",)
