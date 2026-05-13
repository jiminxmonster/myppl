"use client";

import { useEffect, useState } from "react";

import {
  getAdminMarketplaceItems,
  MarketplaceItem,
  resolveMediaUrl,
  updateAdminMarketplaceApproval,
} from "@/lib/api";

export default function AdminContentsPage() {
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [approvalNotes, setApprovalNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    void loadMarketplaceItems(selectedApprovalStatus === "all" ? undefined : selectedApprovalStatus);
  }, [selectedApprovalStatus]);

  async function loadMarketplaceItems(approvalStatus?: "pending" | "approved" | "rejected") {
    try {
      setMarketplaceItems(await getAdminMarketplaceItems(approvalStatus));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "판매상품 검토 목록을 불러오지 못했습니다.");
    }
  }

  async function handleMarketplaceApproval(item: MarketplaceItem, approvalStatus: "approved" | "rejected") {
    await updateAdminMarketplaceApproval(item.id, {
      approval_status: approvalStatus,
      approval_note: approvalNotes[item.id] ?? "",
    });
    await loadMarketplaceItems(selectedApprovalStatus === "all" ? undefined : selectedApprovalStatus);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">판매상품 승인 관리</h2>
            <p className="mt-2 text-sm text-slate-600">판매자가 등록한 상품은 관리자 승인 후에만 상품리스트와 중고장터에 공개됩니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "전체", value: "all" },
              { label: "검토중", value: "pending" },
              { label: "승인", value: "approved" },
              { label: "반려", value: "rejected" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelectedApprovalStatus(item.value as "pending" | "approved" | "rejected" | "all")}
                className={`rounded-[5px] border px-4 py-2 text-sm font-semibold ${
                  selectedApprovalStatus === item.value ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-4">
          {marketplaceItems.length > 0 ? (
            marketplaceItems.map((item) => (
              <article key={item.id} className="rounded-[0.5rem] border border-[var(--border)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
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
                        {item.approval_status === "approved" ? "승인" : item.approval_status === "rejected" ? "반려" : "검토중"}
                      </span>
                      <span className="text-xs text-slate-500">
                        작성자 {item.author_nickname} · {item.product_category_name || item.category_name || "판매상품"}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{item.description}</p>
                    <p className="text-sm text-slate-500">
                      {item.original_price ? (
                        <span className="mr-2 line-through">₩{Number(item.original_price).toLocaleString("ko-KR")}</span>
                      ) : null}
                      <span className="font-semibold text-[var(--brand)]">₩{Number(item.price).toLocaleString("ko-KR")}</span> · {item.region}
                    </p>
                    {item.reviewed_at ? (
                      <p className="text-xs text-slate-400">
                        최근 검토: {new Date(item.reviewed_at).toLocaleString("ko-KR")}
                        {item.reviewed_by_nickname ? ` · ${item.reviewed_by_nickname}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex h-20 w-20 items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/30 p-2">
                    <img
                      src={resolveMediaUrl(item.image || item.external_image_url || "/placeholders/market-default.svg")}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <input
                    type="text"
                    placeholder="검토 메모를 남길 수 있습니다."
                    className="rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm"
                    value={approvalNotes[item.id] ?? item.approval_note ?? ""}
                    onChange={(event) => setApprovalNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => void handleMarketplaceApproval(item, "approved")}
                    className="rounded-[5px] bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleMarketplaceApproval(item, "rejected")}
                    className="rounded-[5px] border border-red-200 px-4 py-3 text-sm font-semibold text-red-600"
                  >
                    반려
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-500">해당 상태의 판매상품이 없습니다.</p>
          )}
        </div>
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
