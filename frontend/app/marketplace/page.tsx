import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { SideCategoryMenu } from "@/components/layout/side-category-menu";
import { MarketplaceBoard } from "@/components/marketplace/marketplace-board";
import { getMarketplaceCategories, getMarketplaceItemsByCategory } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategory = params.category;
  const [items, categories] = await Promise.all([
    getMarketplaceItemsByCategory(selectedCategory).catch(() => []),
    getMarketplaceCategories().catch(() => []),
  ]);

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
      <div className="grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden xl:gap-6 grid-cols-[minmax(0,1fr)_92px] xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-0 overflow-y-auto pr-2">
          <MarketplaceBoard initialItems={items} />
        </div>
        <SideCategoryMenu
          title="중고장터 카테고리"
          description="중고장터는 품목군 기준으로 나눠서 원하는 거래글만 빠르게 보게 합니다."
          basePath="/marketplace"
          categories={categories}
          refreshSource="marketplace"
        />
      </div>
    </section>
  );
}
