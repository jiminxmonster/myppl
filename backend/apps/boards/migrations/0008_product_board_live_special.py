from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0007_product_board_and_search_keyword"),
    ]

    operations = [
        migrations.AddField(
            model_name="board",
            name="product_board_type",
            field=models.CharField(
                choices=[("standard", "일반 상품"), ("live_special", "라이브특가")],
                default="standard",
                max_length=20,
                verbose_name="상품게시판 옵션",
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_url",
            field=models.URLField(blank=True, max_length=500, verbose_name="상품 라이브 방송 링크"),
        ),
    ]
