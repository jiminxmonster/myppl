import { PageNavigator } from "@/components/layout/page-navigator";
import { MarketplaceSellForm } from "@/components/marketplace/marketplace-sell-form";
import { getCatalogCategories, getCatalogProviders, getMarketplaceCategories } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MarketplaceSellPage() {
  const [categories, catalogCategories, providers] = await Promise.all([
    getMarketplaceCategories().catch(() => []),
    getCatalogCategories().catch(() => []),
    getCatalogProviders().catch(() => []),
  ]);

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "중고장터", href: "/marketplace" },
          { label: "물건 팔기" },
        ]}
      />
      <MarketplaceSellForm categories={categories} catalogCategories={catalogCategories} providers={providers} />
    </section>
  );
}
