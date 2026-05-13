from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0008_site_display_and_recent_sections"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="homeheroslide",
            options={"ordering": ["sort_order", "id"]},
        ),
        migrations.AlterField(
            model_name="homeheroslide",
            name="transition_style",
            field=models.CharField(
                choices=[
                    ("next", "깔끔 다음 페이지"),
                    ("slide_lr", "슬라이드 좌우"),
                    ("slide_ud", "슬라이드 상하"),
                    ("fade", "페이드아웃 페이드인"),
                    ("mosaic", "모자이크식 슬라이드전환"),
                    ("zoom", "줌 인"),
                    ("rotate", "회전"),
                    ("flip", "플립"),
                    ("wipe", "와이프"),
                    ("cinema", "시네마 슬라이드"),
                ],
                default="next",
                max_length=20,
                verbose_name="전환 방식",
            ),
        ),
    ]
