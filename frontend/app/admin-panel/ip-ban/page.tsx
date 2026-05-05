"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminIPBan, createAdminIPBan, deleteAdminIPBan, getAdminIPBans } from "@/lib/api";


const initialForm = {
  ip_address: "",
  reason: "",
  expires_at: "",
};

export default function AdminIPBanPage() {
  const [items, setItems] = useState<AdminIPBan[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadItems();
  }, []);

  async function loadItems() {
    try {
      setItems(await getAdminIPBans());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "IP 차단 목록을 불러오지 못했습니다.");
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = await createAdminIPBan({
        ip_address: form.ip_address,
        reason: form.reason,
        expires_at: form.expires_at || null,
      });
      setItems((current) => [created, ...current]);
      setForm(initialForm);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "IP 차단 등록에 실패했습니다.");
    }
  };

  const handleDelete = async (banId: number) => {
    await deleteAdminIPBan(banId);
    setItems((current) => current.filter((item) => item.id !== banId));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">IP 차단</h1>
        <p className="mt-3 text-sm text-slate-600">단일 IP 또는 CIDR 대역을 등록해 접근을 차단합니다.</p>
      </section>
      <form className="grid gap-4 rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleSubmit}>
        <input className="rounded-2xl border border-[var(--border)] px-4 py-3" placeholder="IP 또는 CIDR" value={form.ip_address} onChange={(event) => setForm((current) => ({ ...current, ip_address: event.target.value }))} />
        <input className="rounded-2xl border border-[var(--border)] px-4 py-3" type="datetime-local" value={form.expires_at} onChange={(event) => setForm((current) => ({ ...current, expires_at: event.target.value }))} />
        <textarea className="rounded-[0.5rem] border border-[var(--border)] px-4 py-3 md:col-span-2" rows={3} placeholder="차단 사유" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
        {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
        <button className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">IP 차단 등록</button>
      </form>
      <section className="grid gap-4">
        {items.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[0.58rem] border border-[var(--border)] bg-white p-5 shadow-soft">
            <div>
              <h2 className="text-lg font-bold">{item.ip_address}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.reason}</p>
              <p className="mt-1 text-sm text-slate-500">등록자 {item.created_by_nickname} · 만료 {item.expires_at ? new Date(item.expires_at).toLocaleString("ko-KR") : "없음"}</p>
            </div>
            <button type="button" onClick={() => void handleDelete(item.id)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
              차단 해제
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
