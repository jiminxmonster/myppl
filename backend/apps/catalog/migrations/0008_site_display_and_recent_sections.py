from django.db import migrations, models
from django.db.models import F


def create_default_display_settings(apps, schema_editor):
    SiteDisplaySetting = apps.get_model("catalog", "SiteDisplaySetting")
    HomeProductSectionConfig = apps.get_model("catalog", "HomeProductSectionConfig")

    SiteDisplaySetting.objects.get_or_create(id=1, defaults={"show_side_category_menu": False})
    if not HomeProductSectionConfig.objects.filter(source_type="recent_search").exists():
        HomeProductSectionConfig.objects.all().update(sort_order=F("sort_order") + 1)
        HomeProductSectionConfig.objects.create(
            title="최근많이 검색된 상품",
            description="",
            source_type="recent_search",
            category_keyword="",
            item_limit=12,
            sort_order=0,
            is_active=True,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0007_add_homeheroslide_transition_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="homeproductsectionconfig",
            name="source_type",
            field=models.CharField(
                choices=[("recent_search", "최근검색상품"), ("hotdeal", "핫딜"), ("marketplace", "중고장터")],
                default="marketplace",
                max_length=20,
                verbose_name="데이터 소스",
            ),
        ),
        migrations.CreateModel(
            name="SiteDisplaySetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("show_side_category_menu", models.BooleanField(default=False, verbose_name="좌측 녹색 카테고리 메뉴 노출")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="수정일")),
            ],
            options={
                "verbose_name": "사이트 화면 설정",
                "verbose_name_plural": "사이트 화면 설정",
            },
        ),
        migrations.RunPython(create_default_display_settings, migrations.RunPython.noop),
    ]
