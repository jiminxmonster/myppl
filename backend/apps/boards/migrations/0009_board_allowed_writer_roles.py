import apps.boards.models
from django.db import migrations, models


def normalize_writer_roles(apps, schema_editor):
    board_model = apps.get_model("boards", "Board")
    for board in board_model.objects.all():
        roles = board.allowed_writer_roles if isinstance(board.allowed_writer_roles, list) else []
        if not roles:
            board.allowed_writer_roles = ["all"]
            board.save(update_fields=["allowed_writer_roles"])


class Migration(migrations.Migration):

    dependencies = [
        ("boards", "0008_product_board_live_special"),
    ]

    operations = [
        migrations.AddField(
            model_name="board",
            name="allowed_writer_roles",
            field=models.JSONField(
                blank=True,
                default=apps.boards.models.default_board_writer_roles,
                verbose_name="글쓰기 허용 대상",
            ),
        ),
        migrations.RunPython(normalize_writer_roles, migrations.RunPython.noop),
    ]
