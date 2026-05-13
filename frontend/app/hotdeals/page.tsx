import { SideCategoryMenu } from "@/components/layout/side-category-menu";
import { PageNavigator } from "@/components/layout/page-navigator";
import { HotdealActionBar } from "@/components/hotdeal/hotdeal-action-bar";
import { HotdealBoard } from "@/components/hotdeal/hotdeal-board";
import { getHotdealCategories, getHotdealsByCategory, getSiteDisplaySettings } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HotdealsPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const selectedCategory = params.category;
  const [items, categories, siteSettings] = await Promise.all([
    getHotdealsByCategory(selectedCategory).catch(() => []),
    getHotdealCategories().catch(() => []),
    getSiteDisplaySettings().catch(() => ({ show_side_category_menu: false })),
  ]);
  const showSideCategoryMenu = siteSettings.show_side_category_menu;

  return (
    <section className="flex min-h-[calc(100vh-160px)] flex-col gap-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "핫딜", href: "/hotdeals" },
          ...(selectedCategory ? [{ label: decodeURIComponent(selectedCategory) }] : []),
        ]}
        actions={<HotdealActionBar />}
      />
      <div className={showSideCategoryMenu ? "grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden xl:gap-6 grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[280px_1fr]" : "min-h-0 flex-1 overflow-hidden"}>
        {showSideCategoryMenu ? (
          <SideCategoryMenu
            title="핫딜 카테고리"
            description="핫딜은 상품군별로 묶어서 빠르게 훑어볼 수 있게 정리합니다."
            basePath="/hotdeals"
            categories={categories}
            refreshSource="hotdeal"
          />
        ) : null}
        <div className="min-h-0 overflow-y-auto pr-2">
          <HotdealBoard initialItems={items} />
        </div>
      </div>
    </section>
  );
}
