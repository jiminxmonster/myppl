from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, call_command

from apps.catalog.models import ProductAlertSubscription, ProductCategory, SellerOptionPreset, SubscriptionChannel
from apps.marketplace.models import MarketplaceCategory, MarketplaceItem


HARNESS_PREFIX = "[HARNESS]"


class Command(BaseCommand):
    help = "역할별 수동/자동 검수에 쓸 고정 검증 데이터를 준비합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-bootstrap",
            action="store_true",
            help="기본 게시판/계정/카테고리 시드까지 함께 맞춥니다.",
        )

    def handle(self, *args, **options):
        if options["with_bootstrap"]:
            call_command("bootstrap_community", with_sample_data=True)

        user_model = get_user_model()
        admin = user_model.objects.get(username="admin")
        buyer = user_model.objects.get(username="buy")
        seller = user_model.objects.get(username="sell")

        product_category = ProductCategory.objects.filter(is_active=True, is_visible=True).order_by("sort_order", "id").first()
        marketplace_category = MarketplaceCategory.objects.filter(is_visible=True).order_by("sort_order", "id").first()
        if not product_category or not marketplace_category:
            raise RuntimeError("검증용 카테고리를 찾지 못했습니다. bootstrap_community를 먼저 실행해 주세요.")

        self._reset_harness_data(buyer=buyer, seller=seller)
        option_snapshot = self._build_option_snapshot(product_category)
        approved_item = self._create_marketplace_item(
            seller=seller,
            marketplace_category=marketplace_category,
            product_category=product_category,
            option_snapshot=option_snapshot,
            title=f"{HARNESS_PREFIX} 승인 상품",
            approval_status=MarketplaceItem.APPROVAL_APPROVED,
            approval_note="검증용 승인 상품",
            reviewed_by=admin,
        )
        pending_item = self._create_marketplace_item(
            seller=seller,
            marketplace_category=marketplace_category,
            product_category=product_category,
            option_snapshot=option_snapshot,
            title=f"{HARNESS_PREFIX} 검토중 상품",
            approval_status=MarketplaceItem.APPROVAL_PENDING,
            approval_note="",
            reviewed_by=None,
        )
        subscription = ProductAlertSubscription.objects.create(
            user=buyer,
            category=product_category,
            name=f"{HARNESS_PREFIX} 원하는상품",
            filters=option_snapshot,
            keywords=[product_category.name, "승인"],
            notify_events=["match", "price_drop"],
            is_active=True,
        )
        SubscriptionChannel.objects.create(subscription=subscription, channel=SubscriptionChannel.CHANNEL_IN_APP)
        SubscriptionChannel.objects.create(subscription=subscription, channel=SubscriptionChannel.CHANNEL_EMAIL)
        SellerOptionPreset.objects.create(
            user=seller,
            name=f"{HARNESS_PREFIX} 기본 옵션 세트",
            product_category=product_category,
            option_snapshot=option_snapshot,
        )

        self.stdout.write(self.style.SUCCESS("검증 하네스 데이터 준비가 완료되었습니다."))
        self.stdout.write(f"- 판매자 승인 상품 ID: {approved_item.id}")
        self.stdout.write(f"- 판매자 검토중 상품 ID: {pending_item.id}")
        self.stdout.write(f"- 구매자 원하는상품 ID: {subscription.id}")

    def _reset_harness_data(self, *, buyer, seller):
        MarketplaceItem.objects.filter(author=seller, title__startswith=HARNESS_PREFIX).delete()
        ProductAlertSubscription.objects.filter(user=buyer, name__startswith=HARNESS_PREFIX).delete()
        SellerOptionPreset.objects.filter(user=seller, name__startswith=HARNESS_PREFIX).delete()

    def _build_option_snapshot(self, product_category):
        snapshot = {}
        for filter_item in product_category.filters.filter(is_visible=True).prefetch_related("options").order_by("sort_order", "id"):
            active_options = list(filter_item.options.filter(is_active=True).order_by("sort_order", "id"))
            if filter_item.filter_type == filter_item.TYPE_CHECKBOX:
                snapshot[filter_item.slug] = [active_options[0].label] if active_options else []
            elif filter_item.filter_type == filter_item.TYPE_SINGLE:
                snapshot[filter_item.slug] = active_options[0].label if active_options else ""
            else:
                snapshot[filter_item.slug] = ""
        return snapshot

    def _create_marketplace_item(
        self,
        *,
        seller,
        marketplace_category,
        product_category,
        option_snapshot,
        title,
        approval_status,
        approval_note,
        reviewed_by,
    ):
        return MarketplaceItem.objects.create(
            title=title,
            description="검증용 자동 생성 상품입니다.",
            author=seller,
            category=marketplace_category,
            product_category=product_category,
            price=Decimal("123000"),
            view_count=321 if approval_status == MarketplaceItem.APPROVAL_APPROVED else 111,
            region="서울",
            source_mode=MarketplaceItem.SOURCE_MANUAL,
            option_snapshot=option_snapshot,
            is_negotiable=True,
            approval_status=approval_status,
            approval_note=approval_note,
            reviewed_by=reviewed_by,
        )

