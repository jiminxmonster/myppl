"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PageNavigator } from "@/components/layout/page-navigator";
import { MarketplaceSellForm } from "@/components/marketplace/marketplace-sell-form";
import {
  getCatalogCategories,
  getCatalogProviders,
  getMarketplaceCategories,
  getMarketplaceDetail,
  MarketplaceItem,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function SellerProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const itemId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof getMarketplaceCategories>>>([]);
  const [catalogCategories, setCatalogCategories] = useState<Awaited<ReturnType<typeof getCatalogCategories>>>([]);
  const [providers, setProviders] = useState<Awaited<ReturnType<typeof getCatalogProviders>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || user?.member_type !== "seller") {
      setLoading(false);
      return;
    }
    if (!itemId) {
      setError("수정할 판매상품을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    let mounted = true;
    void Promise.all([
      getMarketplaceDetail(itemId),
      getMarketplaceCategories().catch(() => []),
      getCatalogCategories().catch(() => []),
      getCatalogProviders().catch(() => []),
    ])
      .then(([detail, categoryItems, catalogItems, providerItems]) => {
        if (!mounted) {
          return;
        }
        setItem(detail);
        setCategories(categoryItems);
        setCatalogCategories(catalogItems);
        setProviders(providerItems);
        setError("");
      })
      .catch((requestError) => {
        if (!mounted) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "수정 화면을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, itemId, user?.member_type]);

  if (!isLoggedIn || user?.member_type !== "seller") {
    return (
      <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">
        판매자 계정으로 로그인한 뒤 이용할 수 있습니다.
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">수정 화면을 불러오는 중입니다.</div>;
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-red-600">{error || "수정할 판매상품을 불러오지 못했습니다."}</div>
        <button
          type="button"
          onClick={() => router.push("/seller-products")}
          className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700"
        >
          내판매상품으로 이동
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "내판매상품", href: "/seller-products" },
          { label: item.title, href: `/marketplace/${item.id}` },
          { label: "수정" },
        ]}
      />
      <MarketplaceSellForm
        categories={categories}
        catalogCategories={catalogCategories}
        providers={providers}
        initialItem={item}
      />
    </section>
  );
}
