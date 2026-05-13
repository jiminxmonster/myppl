from django.db.models import F, Q
from django.utils import timezone
from rest_framework import permissions, response, status
from rest_framework.views import APIView

from apps.hotdeals.models import Hotdeal
from apps.marketplace.models import MarketplaceItem

from .models import Post, SearchKeywordStat


def record_search_keyword(query: str) -> None:
    keyword = query.strip()[:100]
    if not keyword:
        return

    now = timezone.now()
    stat, created = SearchKeywordStat.objects.get_or_create(
        keyword=keyword,
        defaults={"search_count": 1, "last_searched_at": now},
    )
    if not created:
        SearchKeywordStat.objects.filter(id=stat.id).update(search_count=F("search_count") + 1, last_searched_at=now)


class UnifiedSearchView(APIView):
    """게시글/핫딜/중고장터 통합 검색 API."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        """질의어를 받아 각 도메인별 상위 결과를 묶어 반환한다."""
        query = request.query_params.get("q", "").strip()
        if not query:
            return response.Response(
                {"query": "", "posts": [], "hotdeals": [], "marketplace": []},
                status=status.HTTP_200_OK,
            )

        record_search_keyword(query)

        post_results = (
            Post.objects.select_related("board", "author")
            .filter(Q(title__icontains=query) | Q(content__icontains=query))
            .order_by("-created_at")[:10]
        )
        hotdeal_results = (
            Hotdeal.objects.select_related("author")
            .filter(Q(title__icontains=query) | Q(description__icontains=query))
            .order_by("-created_at")[:10]
        )
        marketplace_results = (
            MarketplaceItem.objects.select_related("author")
            .filter(Q(title__icontains=query) | Q(description__icontains=query) | Q(region__icontains=query))
            .order_by("-created_at")[:10]
        )

        return response.Response(
            {
                "query": query,
                "posts": [
                    {
                        "id": post.id,
                        "title": post.title,
                        "board_slug": post.board.slug,
                        "board_name": post.board.name,
                        "author_nickname": post.author.nickname,
                        "created_at": post.created_at,
                    }
                    for post in post_results
                ],
                "hotdeals": [
                    {
                        "id": hotdeal.id,
                        "title": hotdeal.title,
                        "author_nickname": hotdeal.author.nickname,
                        "discount_rate": hotdeal.discount_rate,
                        "status": hotdeal.status,
                        "created_at": hotdeal.created_at,
                    }
                    for hotdeal in hotdeal_results
                ],
                "marketplace": [
                    {
                        "id": item.id,
                        "title": item.title,
                        "author_nickname": item.author.nickname,
                        "price": item.price,
                        "region": item.region,
                        "status": item.status,
                        "created_at": item.created_at,
                    }
                    for item in marketplace_results
                ],
            },
            status=status.HTTP_200_OK,
        )


class PopularSearchKeywordView(APIView):
    """메인 자동 상품 섹션에서 사용할 최근 인기 검색어 API."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            limit = min(max(int(request.query_params.get("limit", 20)), 1), 100)
        except (TypeError, ValueError):
            limit = 20

        keywords = SearchKeywordStat.objects.order_by("-search_count", "-last_searched_at", "keyword")[:limit]
        return response.Response(
            [
                {
                    "keyword": item.keyword,
                    "search_count": item.search_count,
                    "last_searched_at": item.last_searched_at,
                }
                for item in keywords
            ],
            status=status.HTTP_200_OK,
        )
