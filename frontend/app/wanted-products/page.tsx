"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageNavigator } from "@/components/layout/page-navigator";
import {
  getProductAlertSubscriptionMatches,
  getProductAlertSubscriptions,
  getProductPlaceholder,
  ProductAlertSubscription,
  ProductAlertSubscriptionMatchGroup,
  resolveMediaUrl,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export const dynamic = "force-dynamic";

function prettifyFilterKey(key: string) {
  return key.replace(/[-_]+/g, " ").trim();
}

function summarizeFilters(filters: Record<string, unknown>) {
  const rawLabels = filters.__filter_labels;
  const filterLabels =
    rawLabels && typeof rawLabels === "object" && !Array.isArray(rawLabels)
      ? (rawLabels as Record<string, string>)
      : {};

  return Object.entries(filters)
    .filter(([key, value]) => !key.startsWith("__") && value !== "" && value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0))
    .map(([key, value]) => ({
      label: filterLabels[key] ?? prettifyFilterKey(key),
      value: Array.isArray(value) ? value.join(", ") : `${value}`,
    }));
}

export default function WantedProductsPage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const [subscriptions, setSubscriptions] = useState<ProductAlertSubscription[]>([]);
  const [matchGroups, setMatchGroups] = useState<Record<number, ProductAlertSubscriptionMatchGroup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn || user?.member_type !== "buyer") {
      setLoading(false);
      return;
    }

    let mounted = true;
    void Promise.all([getProductAlertSubscriptions(), getProductAlertSubscriptionMatches()])
      .then(([response, matches]) => {
        if (!mounted) {
          return;
        }
        setSubscriptions(response);
        setMatchGroups(
          Object.fromEntries(matches.map((group) => [group.subscription_id, group]))
        );
        setError("");
      })
      .catch((requestError) => {
        if (!mounted) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "원하는 상품 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, user?.member_type]);

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "원하는상품" },
        ]}
        actions={
          <Link href="/wanted-products/new" className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
            원하는상품+
          </Link>
        }
      />

      {!isLoggedIn || user?.member_type !== "buyer" ? (
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">
          구매자 계정으로 로그인하면 저장한 원하는 상품과 알림 조건을 확인할 수 있습니다.
        </div>
      ) : loading ? (
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">원하는 상품 목록을 불러오는 중입니다.</div>
      ) : error ? (
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-red-600">{error}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subscriptions.length ? (
            subscriptions.map((item) => (
              <article key={item.id} className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">{item.category_name}</p>
                <h2 className="mt-3 text-xl font-bold text-[var(--ink)]">{item.name}</h2>
                {summarizeFilters(item.filters).length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summarizeFilters(item.filters).slice(0, 6).map((summary) => (
                      <span key={`${item.id}-${summary.label}`} className="rounded-[5px] bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {summary.label}: {summary.value}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-sm text-slate-500">이벤트: {item.notify_events.join(", ") || "-"}</p>
                <p className="mt-1 text-sm text-slate-500">채널: {item.channels.map((channel) => channel.channel).join(", ") || "-"}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString("ko-KR")}</p>
                  <Link href={`/wanted-products/${item.id}/edit`} className="rounded-[5px] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-slate-700">
                    수정
                  </Link>
                </div>
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">매칭 판매상품</p>
                    <span className="text-xs font-semibold text-[var(--brand)]">
                      {matchGroups[item.id]?.match_count ?? 0}건
                    </span>
                  </div>
                  {matchGroups[item.id]?.items?.length ? (
                    <div className="mt-3 space-y-3">
                      {matchGroups[item.id].items.slice(0, 2).map((matchItem) => (
                        <Link
                          key={matchItem.id}
                          href={`/marketplace/${matchItem.id}`}
                          className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-[5px] border border-[var(--border)] p-3 transition hover:border-[var(--brand)]"
                        >
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[5px] bg-[var(--muted)]/25">
                            <img
                              src={resolveMediaUrl(
                                matchItem.image ||
                                  matchItem.external_image_url ||
                                  getProductPlaceholder("marketplace", matchItem.category_name)
                              )}
                              alt={matchItem.title}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--ink)]">{matchItem.title}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {matchItem.product_category_name || matchItem.category_name || "판매상품"} · 조회 {matchItem.view_count}
                            </p>
                            <div className="mt-2">
                              {matchItem.original_price ? (
                                <p className="text-xs font-semibold text-slate-400 line-through">
                                  ₩{Number(matchItem.original_price).toLocaleString("ko-KR")}
                                </p>
                              ) : null}
                              <p className="text-sm font-bold text-[var(--brand)]">
                                ₩{Number(matchItem.price).toLocaleString("ko-KR")}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">아직 조건에 맞는 승인 판매상품이 없습니다.</p>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 text-sm text-slate-500">
              아직 저장한 원하는 상품이 없습니다. 우측 상단의 <strong>원하는상품+</strong> 로 조건을 저장할 수 있습니다.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
