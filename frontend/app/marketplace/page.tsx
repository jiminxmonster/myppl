import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { SideCategoryMenu } from "@/components/layout/side-category-menu";
import { TopCategoryIconMenu } from "@/components/layout/top-category-icon-menu";
import { MarketplaceBoard } from "@/components/marketplace/marketplace-board";
import { getMarketplaceCategories, getMarketplaceItemsByCategory, getSiteDisplaySettings } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategory = params.category;
  const [items, categories, siteSettings] = await Promise.all([
    getMarketplaceItemsByCategory(selectedCategory).catch(() => []),
    getMarketplaceCategories().catch(() => []),
    getSiteDisplaySettings().catch(() => ({ show_side_category_menu: false })),
  ]);
  const showSideCategoryMenu = siteSettings.show_side_category_menu;

  return (
    <section className="flex min-h-[calc(100vh-160px)] flex-col gap-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "중고장터", href: "/marketplace" },
          ...(selectedCategory ? [{ label: decodeURIComponent(selectedCategory) }] : []),
        ]}
        actions={
          <Link href="/marketplace/sell" className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
            물건 팔기 +
          </Link>
        }
      />
      <div className={showSideCategoryMenu ? "grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden xl:gap-6 grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[280px_1fr]" : "min-h-0 flex-1 overflow-hidden"}>
        {showSideCategoryMenu ? (
          <SideCategoryMenu
            title="중고장터 카테고리"
            description="중고장터는 품목군 기준으로 나눠서 원하는 거래글만 빠르게 보게 합니다."
            basePath="/marketplace"
            categories={categories}
            refreshSource="marketplace"
          />
        ) : null}
        <div className="min-h-0 space-y-6 overflow-y-auto pr-2">
          {!showSideCategoryMenu ? (
            <TopCategoryIconMenu basePath="/marketplace" categories={categories} refreshSource="marketplace" selectedCategorySlug={selectedCategory} />
          ) : null}
          <MarketplaceBoard initialItems={items} />
        </div>
      </div>
    </section>
  );
}
