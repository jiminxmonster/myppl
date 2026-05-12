"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { SafeImage } from "@/components/common/safe-image";
import { PageNavigator } from "@/components/layout/page-navigator";
import { MarketplaceDetailActions } from "@/components/marketplace/marketplace-detail-actions";
import { getMarketplaceDetail, getProductPlaceholder, MarketplaceItem, resolveMediaUrl } from "@/lib/api";

export default function MarketplaceDetailPage() {
  const params = useParams<{ id: string }>();
  const itemId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setError("판매글을 불러오지 못했습니다.");
      setLoading(false);
      return;
    }
    let mounted = true;
    void getMarketplaceDetail(itemId)
      .then((response) => {
        if (!mounted) {
          return;
        }
        setItem(response);
        setError("");
      })
      .catch((requestError) => {
        if (!mounted) {
          return;
        }
        setItem(null);
        setError(requestError instanceof Error ? requestError.message : "판매글을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [itemId]);

  if (loading) {
    return <div className="rounded-[0.67rem] bg-white p-8 shadow-soft">판매글을 불러오는 중입니다.</div>;
  }

  if (!item) {
    return <div className="rounded-[0.67rem] bg-white p-8 shadow-soft">{error || "판매글을 불러오지 못했습니다."}</div>;
  }

  return (
    <section className="space-y-6">
      <article className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <PageNavigator
          items={[
            { label: "홈", href: "/" },
            { label: "중고장터", href: "/marketplace" },
            ...(item.category_slug
              ? [{ label: item.category_name, href: `/marketplace?category=${encodeURIComponent(item.category_slug)}` }]
              : []),
            { label: item.title },
          ]}
        />
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">{item.status}</p>
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {item.author_nickname} · {item.region} · {new Date(item.created_at).toLocaleString("ko-KR")}
        </p>
        <div className="mt-6 flex h-80 w-full items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--muted)] p-4">
          <SafeImage
            src={resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name))}
            alt={`${item.title} 대표 이미지`}
            className="h-full w-full object-contain"
            seed={`market-detail-${item.id}-${item.title}`}
          />
        </div>
        <p className="mt-6 text-base leading-7 text-slate-700">{item.description}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2">{Number(item.price).toLocaleString()}원</span>
          <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2">{item.is_negotiable ? "흥정 가능" : "흥정 불가"}</span>
          <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2">구매 요청 {item.purchase_request_count}건</span>
          <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2">{item.source_mode === "imported" ? "외부연동 등록" : "수동 등록"}</span>
        </div>
        {(() => {
          const snapshot = item.option_snapshot ?? {};
          const filterLabelMap =
            snapshot.__filter_labels && typeof snapshot.__filter_labels === "object"
              ? (snapshot.__filter_labels as Record<string, string>)
              : {};
          const checklistCategory =
            snapshot.__checklist_category && typeof snapshot.__checklist_category === "object"
              ? (snapshot.__checklist_category as { name?: string })
              : null;
          const customDetails = Array.isArray(snapshot.__custom_details)
            ? (snapshot.__custom_details as Array<{ label?: string; values?: string[] }>)
            : [];
          const optionEntries = Object.entries(snapshot).filter(([key]) => !key.startsWith("__"));

          if (optionEntries.length === 0 && customDetails.length === 0) {
            return null;
          }

          return (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold text-[var(--ink)]">등록 옵션</h2>
              {checklistCategory?.name ? (
                <p className="text-sm text-slate-500">세부 주제: {checklistCategory.name}</p>
              ) : null}
              {optionEntries.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {optionEntries.map(([key, value]) => (
                    <div key={key} className="rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/25 px-4 py-3 text-sm">
                      <p className="font-semibold text-slate-700">{filterLabelMap[key] || key.replace(/[-_]+/g, " ").trim()}</p>
                      <p className="mt-1 text-slate-600">{Array.isArray(value) ? value.join(", ") : String(value || "-")}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {customDetails.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-[var(--ink)]">판매자 직접 추가 옵션</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {customDetails.map((detail, index) => (
                      <div
                        key={`${detail.label ?? "custom"}-${index}`}
                        className="rounded-[5px] border border-[var(--border)] bg-white px-4 py-3 text-sm"
                      >
                        <p className="font-semibold text-slate-700">{detail.label || "추가 옵션"}</p>
                        <p className="mt-1 text-slate-600">{Array.isArray(detail.values) ? detail.values.join(", ") : "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })()}
      </article>
      <MarketplaceDetailActions itemId={item.id} purchaseRequestCount={item.purchase_request_count} />
    </section>
  );
}
