import re

from rest_framework.exceptions import ValidationError

from .models import KeywordFilter


def apply_keyword_filter(content: str, *, target: str) -> str:
    """게시글/댓글 저장 전 금칙어 필터를 적용한다."""
    filters = KeywordFilter.objects.filter(is_active=True).filter(target__in=[KeywordFilter.TARGET_ALL, target])
    filtered_content = content

    for keyword_filter in filters:
        keyword = keyword_filter.keyword
        matched = False

        if keyword_filter.filter_type == KeywordFilter.FILTER_EXACT:
            matched = filtered_content == keyword
        elif keyword_filter.filter_type == KeywordFilter.FILTER_REGEX:
            matched = re.search(keyword, filtered_content) is not None
        else:
            matched = keyword in filtered_content

        if not matched:
            continue

        if keyword_filter.action == KeywordFilter.ACTION_BLOCK:
            raise ValidationError("금칙어가 포함되어 있습니다.")
        if keyword_filter.action == KeywordFilter.ACTION_REPLACE:
            filtered_content = re.sub(keyword, "***", filtered_content) if keyword_filter.filter_type == KeywordFilter.FILTER_REGEX else filtered_content.replace(keyword, "***")

    return filtered_content
