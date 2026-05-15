import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0008_product_board_live_special"),
        ("catalog", "0009_alter_homeheroslide_options_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="homeproductsectionconfig",
            name="source_type",
            field=models.CharField(
                choices=[
                    ("recent_search", "최근검색상품"),
                    ("hotdeal", "핫딜"),
                    ("marketplace", "중고장터"),
                    ("product_board", "상품게시판"),
                ],
                default="marketplace",
                max_length=20,
                verbose_name="데이터 소스",
            ),
        ),
        migrations.AddField(
            model_name="homeproductsectionconfig",
            name="board",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="home_product_sections",
                to="boards.board",
                verbose_name="연결 상품게시판",
            ),
        ),
    ]
