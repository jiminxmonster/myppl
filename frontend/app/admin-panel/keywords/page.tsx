"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  AdminKeywordFilter,
  createAdminKeywordFilter,
  deleteAdminKeywordFilter,
  getAdminKeywordFilters,
  updateAdminKeywordFilter,
} from "@/lib/api";


const initialForm = {
  keyword: "",
  filter_type: "contains",
  action: "block",
  target: "all",
  is_active: true,
};

export default function AdminKeywordsPage() {
  const [items, setItems] = useState<AdminKeywordFilter[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    try {
      setItems(await getAdminKeywordFilters());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "금칙어 목록을 불러오지 못했습니다.");
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = await createAdminKeywordFilter(form);
      setItems((current) => [created, ...current]);
      setForm(initialForm);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "금칙어 생성에 실패했습니다.");
    }
  };

  const handleToggle = async (item: AdminKeywordFilter) => {
    const updated = await updateAdminKeywordFilter(item.id, { is_active: !item.is_active });
    setItems((current) => current.map((currentItem) => (currentItem.id === updated.id ? updated : currentItem)));
  };

  const handleDelete = async (itemId: number) => {
    await deleteAdminKeywordFilter(itemId);
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">금칙어 관리</h1>
        <p className="mt-3 text-sm text-slate-600">게시글과 댓글 저장 전에 차단 또는 치환할 키워드를 등록합니다.</p>
      </section>
      <form className="grid gap-4 rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleSubmit}>
        <input className="rounded-2xl border border-[var(--border)] px-4 py-3" placeholder="키워드" value={form.keyword} onChange={(event) => setForm((current) => ({ ...current, keyword: event.target.value }))} />
        <select className="rounded-2xl border border-[var(--border)] px-4 py-3" value={form.filter_type} onChange={(event) => setForm((current) => ({ ...current, filter_type: event.target.value }))}>
          <option value="contains">포함</option>
          <option value="exact">완전일치</option>
          <option value="regex">정규식</option>
        </select>
        <select className="rounded-2xl border border-[var(--border)] px-4 py-3" value={form.action} onChange={(event) => setForm((current) => ({ ...current, action: event.target.value }))}>
          <option value="block">차단</option>
          <option value="replace">치환</option>
          <option value="flag">검토</option>
        </select>
        <select className="rounded-2xl border border-[var(--border)] px-4 py-3" value={form.target} onChange={(event) => setForm((current) => ({ ...current, target: event.target.value }))}>
          <option value="all">전체</option>
          <option value="post">게시글</option>
          <option value="comment">댓글</option>
          <option value="nickname">닉네임</option>
        </select>
        {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
        <button className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">금칙어 등록</button>
      </form>
      <section className="grid gap-4">
        {items.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[0.58rem] border border-[var(--border)] bg-white p-5 shadow-soft">
            <div>
              <h2 className="text-lg font-bold">{item.keyword}</h2>
              <p className="mt-1 text-sm text-slate-600">타입 {item.filter_type} · 동작 {item.action} · 대상 {item.target}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleToggle(item)} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                {item.is_active ? "비활성화" : "활성화"}
              </button>
              <button type="button" onClick={() => void handleDelete(item.id)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                삭제
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
