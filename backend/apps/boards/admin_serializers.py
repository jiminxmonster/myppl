from rest_framework import serializers

from .models import Board


class AdminBoardSerializer(serializers.ModelSerializer):
    """운영자 게시판 관리 직렬화기."""

    post_count = serializers.SerializerMethodField()

    def get_post_count(self, obj):
        return getattr(obj, "post_count", 0)

    def validate_allowed_writer_roles(self, value):
        allowed_values = {role for role, _label in Board.WRITER_ROLE_CHOICES}
        if not isinstance(value, list):
            raise serializers.ValidationError("글쓰기 허용 대상 형식이 올바르지 않습니다.")

        normalized = []
        for role in value:
            if role not in allowed_values:
                raise serializers.ValidationError("지원하지 않는 글쓰기 허용 대상입니다.")
            if role not in normalized:
                normalized.append(role)

        if not normalized:
            raise serializers.ValidationError("글쓰기 허용 대상을 하나 이상 선택하세요.")
        if Board.WRITER_ALL in normalized:
            return [Board.WRITER_ALL]
        return normalized

    class Meta:
        model = Board
        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "board_type",
            "product_board_type",
            "audience",
            "description",
            "icon",
            "sort_order",
            "is_visible",
            "show_in_top_menu",
            "min_grade",
            "write_grade",
            "allowed_writer_roles",
            "comment_grade",
            "read_permission",
            "allow_anonymous",
            "allow_anonymous_post",
            "allow_file_upload",
            "use_category",
            "post_count",
        )
        read_only_fields = ("slug",)
