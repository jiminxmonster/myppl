from rest_framework import serializers
from .models import LiveRoom, LiveRoomProduct, LiveChatMessage
from apps.boards.models import Post


class LiveRoomSerializer(serializers.ModelSerializer):
    thumbnail_url = serializers.SerializerMethodField()
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = LiveRoom
        fields = [
            "id", "title", "description", "status", "starts_at",
            "thumbnail_url", "product_count", "chat_enabled", "guest_view_allowed"
        ]

    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            return obj.thumbnail.url
        return ""

    def get_product_count(self, obj):
        return obj.products.count()


class LiveRoomDetailSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    embed_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = LiveRoom
        fields = [
            "id", "title", "description", "live_url", "embed_url",
            "thumbnail_url", "status", "starts_at", "started_at", "ended_at",
            "chat_enabled", "guest_view_allowed", "products"
        ]

    def get_embed_url(self, obj):
        return obj.get_effective_embed_url()

    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            return obj.thumbnail.url
        return ""

    def get_products(self, obj):
        qs = obj.products.select_related("post").order_by("sort_order")
        return [
            {
                "id": lp.id,
                "post_id": lp.post_id,
                "title": lp.title or lp.post.title,
                "price": lp.price or str(lp.post.product_sale_price or ""),
                "image": lp.image or (lp.post.images.first().image.url if lp.post.images.exists() else ""),
                "external_url": lp.external_url or lp.post.product_live_url,
                "is_featured": lp.is_featured,
            }
            for lp in qs
        ]


class LiveChatMessageSerializer(serializers.ModelSerializer):
    nickname = serializers.SerializerMethodField()

    class Meta:
        model = LiveChatMessage
        fields = ["id", "user_id", "nickname", "message", "created_at", "is_hidden"]

    def get_nickname(self, obj):
        if obj.user:
            return getattr(obj.user, "nickname", obj.user.username)
        return "익명"


class AdminLiveRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveRoom
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by", "updated_by"]
