import Link from "next/link";

import { SafeImage } from "@/components/common/safe-image";
import { PageNavigator } from "@/components/layout/page-navigator";
import { SideCategoryMenu } from "@/components/layout/side-category-menu";
import { TopCategoryIconMenu } from "@/components/layout/top-category-icon-menu";
import { ProductsActionBar } from "@/components/products/products-action-bar";
import {
  AdminMenuCategory,
  getHotdeals,
  getHotdealCategories,
  getMarketplaceItems,
  getMarketplaceCategories,
  getProductPlaceholder,
  getSiteDisplaySettings,
  resolveMediaUrl,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type ProductListItem = {
  id: string;
  title: string;
  image: string;
  href: string;
  price: string;
  originalPrice?: string | null;
  discountRate?: number | null;
  shippingLabel: string;
  viewCount: number;
  kind: "hotdeal" | "marketplace";
};

type ProductMenuCategory = AdminMenuCategory & {
  source: "hotdeal" | "marketplace";
};

function formatPrice(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function calculateDiscountRate(originalPrice: number | null, currentPrice: number) {
  if (!originalPrice || !Number.isFinite(originalPrice) || !Number.isFinite(currentPrice) || originalPrice <= currentPrice) {
    return null;
  }
  return Math.round((1 - currentPrice / originalPrice) * 100);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategorySlug = params.category ? decodeURIComponent(params.category) : null;

  const [catalogCategories, hotdeals, marketplaceItems, siteSettings] = await Promise.all([
    Promise.all([getHotdealCategories().catch(() => []), getMarketplaceCategories().catch(() => [])]),
    getHotdeals().catch(() => []),
    getMarketplaceItems().catch(() => []),
    getSiteDisplaySettings().catch(() => ({ show_side_category_menu: false })),
  ]);
  const showSideCategoryMenu = siteSettings.show_side_category_menu;

  const [hotdealCategories, marketplaceCategories] = catalogCategories;
  const saleCategories: ProductMenuCategory[] = hotdealCategories
    .filter((category) => category.is_visible)
    .map((category) => ({
      ...category,
      slug: `hotdeal:${category.slug}`,
      source: "hotdeal" as const,
    }))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  const usedCategories: ProductMenuCategory[] = marketplaceCategories
    .filter((category) => category.is_visible)
    .map((category) => ({
      ...category,
      slug: `marketplace:${category.slug}`,
      source: "marketplace" as const,
    }))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
  const topCategories = [...saleCategories, ...usedCategories];
  const selectedCategory = topCategories.find((category) => category.slug === selectedCategorySlug) ?? null;
  const selectedCategorySource = selectedCategory?.source ?? null;
  const selectedRawCategorySlug = selectedCategory ? selectedCategory.slug.split(":")[1] ?? "" : "";

  const productItems: ProductListItem[] = [
    ...marketplaceItems
      .filter((item) =>
        selectedCategorySource ? selectedCategorySource === "marketplace" && item.category_slug === selectedRawCategorySlug : true
      )
      .map((item) => {
        const priceValue = Number(item.price);
        const originalPriceValue = item.original_price ? Number(item.original_price) : null;
        const discountRate = calculateDiscountRate(originalPriceValue, priceValue);

        return {
          id: `marketplace-${item.id}`,
          title: item.title,
          image: resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name)),
          href: `/marketplace/${item.id}`,
          price: formatPrice(priceValue),
          originalPrice: discountRate && originalPriceValue ? formatPrice(originalPriceValue) : null,
          discountRate,
          shippingLabel: "무료배송",
          viewCount: item.view_count,
          kind: "marketplace" as const,
        };
      }),
    ...hotdeals
      .filter((item) =>
        selectedCategorySource ? selectedCategorySource === "hotdeal" && item.category_slug === selectedRawCategorySlug : true
      )
      .map((item) => {
        const priceValue = Number(item.sale_price);
        const originalPriceValue = Number(item.original_price);
        const apiDiscountRate = Number(item.discount_rate);
        const discountRate = Number.isFinite(apiDiscountRate) && apiDiscountRate > 0
          ? Math.round(apiDiscountRate)
          : calculateDiscountRate(originalPriceValue, priceValue);

        return {
          id: `hotdeal-${item.id}`,
          title: item.title,
          image: resolveMediaUrl(item.image || getProductPlaceholder("hotdeal", item.category_name)),
          href: `/hotdeals/${item.id}`,
          price: formatPrice(priceValue),
          originalPrice: discountRate ? formatPrice(originalPriceValue) : null,
          discountRate,
          shippingLabel: "무료배송",
          viewCount: item.view_count,
          kind: "hotdeal" as const,
        };
      }),
  ].sort((left, right) => right.viewCount - left.viewCount);

  const groupedMenuCategories = [
    {
      id: "sale",
      label: "판매상품",
      categories: saleCategories,
    },
    {
      id: "used",
      label: "중고상품",
      categories: usedCategories,
    },
  ];

  const selectedCategoryName = selectedCategory
    ? `${selectedCategorySource === "hotdeal" ? "판매상품" : "중고상품"} · ${selectedCategory.name}`
    : null;

  const selectedCategoryTitle = selectedCategory
    ? `${selectedCategorySource === "hotdeal" ? "판매상품" : "중고상품"} ${selectedCategory.name}`
    : null;

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "상품리스트", href: "/products" },
          ...(selectedCategoryName ? [{ label: selectedCategoryName }] : []),
        ]}
        actions={<ProductsActionBar />}
      />

      <div className={showSideCategoryMenu ? "grid items-stretch gap-3 xl:gap-6 grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[280px_1fr]" : "block"}>
        {showSideCategoryMenu ? (
          <SideCategoryMenu
            title="상품 카테고리"
            basePath="/products"
            categories={topCategories}
            groupedCategories={groupedMenuCategories}
            selectedCategorySlug={selectedCategorySlug}
            refreshSource="products"
          />
        ) : null}
        <div className="space-y-5">
          {!showSideCategoryMenu ? (
            <TopCategoryIconMenu
              basePath="/products"
              categories={topCategories}
              groupedCategories={groupedMenuCategories}
              selectedCategorySlug={selectedCategorySlug}
              refreshSource="products"
            />
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--ink)]">
                {selectedCategoryTitle ? `${selectedCategoryTitle} 리스트` : "전체 상품리스트"}
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500">총 {productItems.length}개</p>
          </div>

          {productItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 lg:gap-4">
              {productItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="overflow-hidden rounded-[0.5rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-0.5"
                >
                  <div className="flex aspect-square items-center justify-center bg-[var(--muted)]/30 p-2 sm:p-3">
                    <SafeImage src={item.image} alt={item.title} className="h-full w-full object-contain" seed={`${item.kind}-${item.id}-${item.title}`} />
                  </div>
                  <div className="space-y-1.5 p-2 sm:p-3">
                    <p className="line-clamp-2 min-h-[2.25rem] text-[12px] font-bold leading-snug text-[var(--ink)] sm:min-h-[2.5rem] sm:text-sm">{item.title}</p>
                    {item.originalPrice && item.discountRate ? (
                      <p className="flex items-baseline gap-1 text-[11px] font-semibold sm:text-xs">
                        <span className="text-red-600">{item.discountRate}%</span>
                        <span className="text-slate-400 line-through">{item.originalPrice}</span>
                      </p>
                    ) : null}
                    <p className="truncate text-sm font-black text-[var(--brand)] sm:text-base">{item.price}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs">{item.shippingLabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[0.67rem] border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center text-sm text-slate-500">
              조건에 맞는 상품이 아직 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
