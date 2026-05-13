from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0006_comment_is_secret"),
    ]

    operations = [
        migrations.AlterField(
            model_name="board",
            name="board_type",
            field=models.CharField(
                choices=[
                    ("general", "일반"),
                    ("product", "상품게시판"),
                    ("hotdeal", "핫딜"),
                    ("marketplace", "중고장터"),
                    ("notice", "공지"),
                ],
                default="general",
                max_length=20,
                verbose_name="게시판 종류",
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="product_original_price",
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=12, null=True, verbose_name="상품 원래가격"),
        ),
        migrations.AddField(
            model_name="post",
            name="product_sale_price",
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=12, null=True, verbose_name="상품 현재가격"),
        ),
        migrations.CreateModel(
            name="SearchKeywordStat",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("keyword", models.CharField(max_length=100, unique=True, verbose_name="검색어")),
                ("search_count", models.PositiveIntegerField(default=1, verbose_name="검색 횟수")),
                ("last_searched_at", models.DateTimeField(verbose_name="최근 검색 시각")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="생성일")),
            ],
            options={
                "ordering": ["-search_count", "-last_searched_at", "keyword"],
            },
        ),
    ]
