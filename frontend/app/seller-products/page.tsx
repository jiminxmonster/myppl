"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageNavigator } from "@/components/layout/page-navigator";
import { deleteMarketplaceItem, getMyMarketplaceItems, getProductPlaceholder, MarketplaceItem, resolveMediaUrl } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export const dynamic = "force-dynamic";

export default function SellerProductsPage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || user?.member_type !== "seller") {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadItems = async () =>
      getMyMarketplaceItems()
      .then((response) => {
        if (!mounted) {
          return;
        }
        setItems(response);
        setError("");
      })
      .catch((requestError) => {
        if (!mounted) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "내 판매 상품을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    void loadItems();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.member_type]);

  async function handleDelete(item: MarketplaceItem) {
    const confirmed = window.confirm(`'${item.title}' 판매상품을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }
    try {
      await deleteMarketplaceItem(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "판매상품 삭제에 실패했습니다.");
    }
  }

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "내판매상품" },
        ]}
        actions={
          <Link href="/marketplace/sell" className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
            상품올리기+
          </Link>
        }
      />

      {!isLoggedIn || user?.member_type !== "seller" ? (
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">
          판매자 계정으로 로그인하면 등록한 상품을 확인하고 수정할 수 있습니다.
        </div>
      ) : loading ? (
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">내 판매 상품을 불러오는 중입니다.</div>
      ) : error ? (
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.length ? (
            items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft">
                <Link href={`/marketplace/${item.id}`} className="block">
                  <div className="flex aspect-[4/3] items-center justify-center bg-[var(--muted)]/30 p-6">
                    <img
                      src={resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name))}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </Link>
                <div className="space-y-3 p-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-[5px] px-2 py-1 text-xs font-semibold ${
                          item.approval_status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.approval_status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {item.approval_status === "approved"
                          ? "승인 완료"
                          : item.approval_status === "rejected"
                            ? "반려됨"
                            : "관리자 검토중"}
                      </span>
                      {item.source_mode === "imported" ? (
                        <span className="rounded-[5px] bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          외부연동
                        </span>
                      ) : null}
                    </div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-500">
                      {item.product_category_name || item.category_name || "판매 상품"} · {item.source_mode === "imported" ? "외부연동" : "수동등록"}
                    </p>
                    {item.approval_note ? (
                      <p className="text-sm text-slate-500">검토 메모: {item.approval_note}</p>
                    ) : null}
                  </div>
                  <div>
                    {item.original_price ? (
                      <p className="text-sm font-semibold text-slate-400 line-through">₩{Number(item.original_price).toLocaleString("ko-KR")}</p>
                    ) : null}
                    <p className="text-lg font-bold text-[var(--brand)]">₩{Number(item.price).toLocaleString("ko-KR")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/marketplace/${item.id}`} className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700">
                      상세보기
                    </Link>
                    <Link href={`/seller-products/${item.id}/edit`} className="rounded-[5px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
                      수정
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      className="rounded-[5px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">
              아직 등록한 판매 상품이 없습니다. 우측 상단의 <strong>상품올리기+</strong> 로 첫 상품을 등록할 수 있습니다.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
