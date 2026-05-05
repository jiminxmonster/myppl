import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { SideCategoryMenu } from "@/components/layout/side-category-menu";
import { ProductsActionBar } from "@/components/products/products-action-bar";
import {
  AdminMenuCategory,
  getHotdeals,
  getHotdealCategories,
  getMarketplaceItems,
  getMarketplaceCategories,
  getProductPlaceholder,
  resolveMediaUrl,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type ProductListItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  price: string;
  viewCount: number;
  kind: "hotdeal" | "marketplace";
};

type ProductMenuCategory = AdminMenuCategory & {
  source: "hotdeal" | "marketplace";
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategorySlug = params.category ? decodeURIComponent(params.category) : null;

  const [catalogCategories, hotdeals, marketplaceItems] = await Promise.all([
    Promise.all([getHotdealCategories().catch(() => []), getMarketplaceCategories().catch(() => [])]),
    getHotdeals().catch(() => []),
    getMarketplaceItems().catch(() => []),
  ]);

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
      .map((item) => ({
        id: `marketplace-${item.id}`,
        title: item.title,
        subtitle: `${item.category_name || "중고장터"} · ${item.region} · 조회 ${item.view_count}`,
        image: resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name)),
        href: `/marketplace/${item.id}`,
        price: `₩${Number(item.price).toLocaleString("ko-KR")}`,
        viewCount: item.view_count,
        kind: "marketplace" as const,
      })),
    ...hotdeals
      .filter((item) =>
        selectedCategorySource ? selectedCategorySource === "hotdeal" && item.category_slug === selectedRawCategorySlug : true
      )
      .map((item) => ({
        id: `hotdeal-${item.id}`,
        title: item.title,
        subtitle: `${item.category_name || "핫딜"} · 할인 ${Number(item.discount_rate).toFixed(0)}% · 조회 ${item.view_count}`,
        image: resolveMediaUrl(item.image || getProductPlaceholder("hotdeal", item.category_name)),
        href: `/hotdeals/${item.id}`,
        price: `₩${Number(item.sale_price).toLocaleString("ko-KR")}`,
        viewCount: item.view_count,
        kind: "hotdeal" as const,
      })),
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

      <div className="grid items-stretch gap-3 xl:gap-6 grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[280px_1fr]">
        <SideCategoryMenu
          title="상품 카테고리"
          basePath="/products"
          categories={topCategories}
          groupedCategories={groupedMenuCategories}
          selectedCategorySlug={selectedCategorySlug}
          refreshSource="products"
        />

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--ink)]">
                {selectedCategoryTitle ? `${selectedCategoryTitle} 리스트` : "전체 상품리스트"}
              </h1>
            </div>
            <p className="text-sm font-medium text-slate-500">총 {productItems.length}개</p>
          </div>

          {productItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 sm:gap-4 xl:grid-cols-3 xl:gap-5">
              {productItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-1"
                >
                  <div className="flex aspect-square items-center justify-center bg-[var(--muted)]/30 p-3 sm:aspect-[5/4] sm:p-5">
                    <img src={item.image} alt={item.title} className="h-full w-full object-contain" />
                  </div>
                  <div className="space-y-2 p-3 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`rounded-[5px] px-2 py-1 text-[10px] font-semibold sm:text-xs ${
                          item.kind === "hotdeal" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.kind === "hotdeal" ? "핫딜" : "중고장터"}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 sm:text-xs">조회 {item.viewCount}</span>
                    </div>
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-[var(--ink)] sm:min-h-[3rem] sm:text-base">{item.title}</p>
                    <p className="line-clamp-2 text-xs text-slate-500 sm:text-sm">{item.subtitle}</p>
                    <p className="text-base font-bold text-[var(--brand)] sm:text-lg">{item.price}</p>
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
