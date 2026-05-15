from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0009_board_allowed_writer_roles"),
    ]

    operations = [
        migrations.AddField(
            model_name="post",
            name="product_live_platform",
            field=models.CharField(blank=True, max_length=80, verbose_name="라이브 방송 플랫폼"),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_channel",
            field=models.CharField(blank=True, max_length=100, verbose_name="라이브 방송 채널명"),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_starts_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="라이브 방송 시작일시"),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_ends_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="라이브 방송 종료일시"),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("scheduled", "예정"),
                    ("on_air", "진행중"),
                    ("ended", "종료"),
                    ("replay", "다시보기"),
                ],
                default="scheduled",
                max_length=20,
                verbose_name="라이브 방송 상태",
            ),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_benefit",
            field=models.CharField(blank=True, max_length=200, verbose_name="라이브 방송 혜택 문구"),
        ),
        migrations.AddField(
            model_name="post",
            name="product_live_button_label",
            field=models.CharField(blank=True, default="라이브 보기", max_length=40, verbose_name="라이브 방송 버튼 문구"),
        ),
    ]
