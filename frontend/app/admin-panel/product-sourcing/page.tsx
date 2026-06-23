"use client";

import React, { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { apiClient, getBoards } from "@/lib/api";

type SourcingResult = {
  external_id: string;
  provider: string;
  title: string;
  image_url: string;
  product_url: string;
  store_name: string;
  original_price: number;
  sale_price: number;
  category?: string;
};

type BoardOption = {
  id: number;
  name: string;
  slug: string;
};

type ImportResult = {
  post_id: number;
  title: string;
  url: string;
};

export default function ProductSourcingPage() {
  const [provider, setProvider] = useState<"mock" | "naver" | "coupang">("mock");
  const [keyword, setKeyword] = useState("");
  const [boardSlug, setBoardSlug] = useState("seller-hot-issues");
  const [results, setResults] = useState<SourcingResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ created: ImportResult[]; failed: any[] } | null>(null);

  useEffect(() => {
    async function loadBoards() {
      try {
        const list = await getBoards();
        // writable product/community boards only (1차 범위)
        const filtered = list.filter((b: any) =>
          ["seller-hot-issues", "buyer-hot-issues", "community", "seller-community", "buyer-community"].includes(b.slug)
        );
        if (filtered.length > 0) {
          setBoards(filtered);
          if (!boardSlug || !filtered.some((b) => b.slug === boardSlug)) {
            setBoardSlug(filtered[0].slug);
          }
        }
      } catch {}
    }
    loadBoards();
  }, []);

  async function handleSearch() {
    if (!keyword.trim()) return;
    setLoading(true);
    setResultMsg(null);
    try {
      const res = await apiClient.post("/admin/product-sourcing/search/", {
        provider,
        keyword: keyword.trim(),
        page: 1,
        limit: 20,
      });
      const data = res.data.results || [];
      setResults(data);
      setSelected(new Set());
    } catch (e: any) {
      alert("검색 실패: " + (e?.response?.data?.detail || e.message));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleImport() {
    if (selected.size === 0) return;
    setImporting(true);
    setResultMsg(null);
    const items = results.filter((r) => selected.has(r.external_id));
    try {
      const res = await apiClient.post("/admin/product-sourcing/import/", {
        board_slug: boardSlug,
        items,
      });
      setResultMsg(res.data);
      // clear selection
      setSelected(new Set());
      setResults([]);
    } catch (e: any) {
      alert("등록 실패: " + (e?.response?.data?.detail || e.message));
    } finally {
      setImporting(false);
    }
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">상품소싱 (1차: Mock)</h1>

        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1">쇼핑몰 제공자</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="mock">Mock (테스트)</option>
                <option value="naver" disabled>네이버 쇼핑 (준비중)</option>
                <option value="coupang" disabled>쿠팡 (준비중)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">검색어</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 무선 키보드"
                className="w-full rounded border px-3 py-2"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">등록 게시판</label>
              <select
                value={boardSlug}
                onChange={(e) => setBoardSlug(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                {boards.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !keyword.trim()}
            className="mt-4 rounded bg-[var(--brand)] px-6 py-2 text-white disabled:opacity-50"
          >
            {loading ? "검색 중..." : "검색"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">검색 결과 ({results.length}개)</div>
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-50"
              >
                선택 {selected.size}개 등록
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => {
                const isSel = selected.has(item.external_id);
                return (
                  <label
                    key={item.external_id}
                    className={`flex gap-3 rounded border p-3 cursor-pointer ${isSel ? "border-[var(--brand)] bg-[var(--muted)]/30" : "border-[var(--border)]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleSelect(item.external_id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-3">
                        <img
                          src={item.image_url || "/placeholders/market-default.svg"}
                          alt=""
                          className="h-16 w-16 object-cover rounded border"
                          onError={(e) => (e.currentTarget.src = "/placeholders/market-default.svg")}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium line-clamp-2">{item.title}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {item.store_name} · {item.category || ""}
                          </div>
                          <div className="text-sm mt-1">
                            <span className="line-through text-slate-400 mr-1">
                              {item.original_price?.toLocaleString()}원
                            </span>
                            <span className="font-semibold text-[var(--brand)]">
                              {item.sale_price?.toLocaleString()}원
                            </span>
                          </div>
                          <a
                            href={item.product_url}
                            target="_blank"
                            className="text-[10px] text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            외부 링크
                          </a>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {resultMsg && (
          <div className="rounded border bg-white p-4 text-sm">
            <div className="font-semibold mb-2">등록 결과</div>
            {resultMsg.created.length > 0 && (
              <div className="mb-2">
                성공: {resultMsg.created.length}건
                <ul className="list-disc ml-4">
                  {resultMsg.created.map((c, i) => (
                    <li key={i}>
                      <a href={c.url} target="_blank" className="text-blue-600 hover:underline">
                        {c.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resultMsg.failed.length > 0 && (
              <div className="text-red-600">실패: {resultMsg.failed.length}건</div>
            )}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
