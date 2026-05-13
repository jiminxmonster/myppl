from django.contrib import admin

from .models import Board, Comment, KeywordFilter, Post, PostImage, PostLike, Report, SearchKeywordStat

admin.site.register(Board)
admin.site.register(Post)
admin.site.register(PostImage)
admin.site.register(PostLike)
admin.site.register(Comment)
admin.site.register(Report)
admin.site.register(KeywordFilter)
admin.site.register(SearchKeywordStat)
