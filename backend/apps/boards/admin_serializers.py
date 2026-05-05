from rest_framework import serializers

from .models import Board


class AdminBoardSerializer(serializers.ModelSerializer):
    """운영자 게시판 관리 직렬화기."""

    post_count = serializers.SerializerMethodField()

    def get_post_count(self, obj):
        return getattr(obj, "post_count", 0)

    class Meta:
        model = Board
        fields = (
            "id",
            "name",
            "slug",
            "parent",
            "board_type",
            "audience",
            "description",
            "icon",
            "sort_order",
            "is_visible",
            "show_in_top_menu",
            "min_grade",
            "write_grade",
            "comment_grade",
            "read_permission",
            "allow_anonymous",
            "allow_anonymous_post",
            "allow_file_upload",
            "use_category",
            "post_count",
        )
        read_only_fields = ("slug",)
