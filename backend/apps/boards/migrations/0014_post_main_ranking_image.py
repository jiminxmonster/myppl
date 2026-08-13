# Generated manually to align the Post model with deployed database schema.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0013_postmalllink"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="main_ranking_image",
            field=models.ImageField(
                blank=True,
                help_text="홈 상품 순위(상품순위노출)에서 사용되는 대표 이미지. 미지정 시 첫 첨부/본문 이미지를 사용합니다.",
                null=True,
                upload_to="posts/ranking/",
                verbose_name="메인 순위 노출용 이미지",
            ),
        ),
    ]
