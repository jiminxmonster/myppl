"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getStoredTokens } from "@/lib/auth";
import { AdminMenuCategory, createHotdeal } from "@/lib/api";

type HotdealCreateFormProps = {
  categories: AdminMenuCategory[];
};

export function HotdealCreateForm({ categories }: HotdealCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    category: 0,
    title: "",
    description: "",
    source_url: "",
    live_url: "",
    original_price: "",
    sale_price: "",
    expires_at: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setError("로그인 후 핫딜을 등록할 수 있습니다.");
      setLoading(false);
      return;
    }

    try {
      const created = await createHotdeal({ ...form, image });
      router.push(`/hotdeals/${created.id}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "핫딜 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-4 border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleSubmit}>
      <select className="border border-[var(--border)] px-4 py-3" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: Number(event.target.value) }))}>
        <option value={0}>카테고리 선택</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input className="border border-[var(--border)] px-4 py-3" placeholder="핫딜 제목" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
      <input className="border border-[var(--border)] px-4 py-3" placeholder="구매 링크" value={form.source_url} onChange={(event) => setForm((current) => ({ ...current, source_url: event.target.value }))} />
      <input className="border border-[var(--border)] px-4 py-3" placeholder="타사 라이브 방송 링크 (선택)" value={form.live_url} onChange={(event) => setForm((current) => ({ ...current, live_url: event.target.value }))} />
      <input className="border border-[var(--border)] px-4 py-3" placeholder="정가" value={form.original_price} onChange={(event) => setForm((current) => ({ ...current, original_price: event.target.value }))} />
      <input className="border border-[var(--border)] px-4 py-3" placeholder="판매가" value={form.sale_price} onChange={(event) => setForm((current) => ({ ...current, sale_price: event.target.value }))} />
      <input className="border border-[var(--border)] px-4 py-3" type="datetime-local" value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} />
      <input className="border border-[var(--border)] px-4 py-3" type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
      <textarea className="border border-[var(--border)] px-4 py-3 md:col-span-2" rows={5} placeholder="핫딜 설명" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
      {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
      <button type="submit" disabled={loading} className="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
        {loading ? "등록 중..." : "핫딜 등록"}
      </button>
    </form>
  );
}
