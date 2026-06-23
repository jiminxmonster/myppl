"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";

export default function LiveCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");

  const [form, setForm] = useState({
    title: "",
    description: "",
    live_url: "",
    embed_url: "",
    starts_at: "",
    status: "scheduled",
    chat_enabled: true,
    guest_view_allowed: true,
  });
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (editId) {
      setIsEdit(true);
      apiClient.get(`/live/admin/${editId}/`).then(res => {
        const d = res.data;
        setForm({
          title: d.title || "",
          description: d.description || "",
          live_url: d.live_url || "",
          embed_url: d.embed_url || "",
          starts_at: d.starts_at ? d.starts_at.slice(0,16) : "",
          status: d.status || "scheduled",
          chat_enabled: !!d.chat_enabled,
          guest_view_allowed: !!d.guest_view_allowed,
        });
      }).catch(() => {});
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, String(v));
      });
      if (thumbnail) formData.append("thumbnail", thumbnail);

      if (isEdit && editId) {
        await apiClient.patch(`/live/admin/${editId}/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("방송이 수정되었습니다.");
        router.push(`/live/${editId}`);
      } else {
        const res = await apiClient.post("/live/admin/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("방송이 생성되었습니다.");
        router.push(`/live/${res.data.id}`);
      }
    } catch (err: any) {
      alert("저장 실패: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">방송하기</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input placeholder="제목" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border p-2 rounded" required />
        <textarea placeholder="설명" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border p-2 rounded" />
        <input placeholder="외부 라이브 URL (YouTube 등)" value={form.live_url} onChange={e => setForm({...form, live_url: e.target.value})} className="w-full border p-2 rounded" />
        <input placeholder="Embed URL (선택, 자동 변환 실패 시)" value={form.embed_url} onChange={e => setForm({...form, embed_url: e.target.value})} className="w-full border p-2 rounded" />
        <input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} className="w-full border p-2 rounded" />
        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full border p-2 rounded">
          <option value="scheduled">예정</option>
          <option value="live">라이브</option>
          <option value="ended">종료</option>
          <option value="hidden">숨김</option>
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.chat_enabled} onChange={e => setForm({...form, chat_enabled: e.target.checked})} /> 채팅 사용
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.guest_view_allowed} onChange={e => setForm({...form, guest_view_allowed: e.target.checked})} /> 비로그인 시청 허용
        </label>
        <input type="file" accept="image/*" onChange={e => setThumbnail(e.target.files?.[0] || null)} className="block" />
        <button disabled={loading} className="w-full bg-[var(--brand)] text-white py-3 rounded">
          {loading ? (isEdit ? "수정 중..." : "등록 중...") : (isEdit ? "방송 수정" : "방송 등록")}
        </button>
      </form>
      <p className="text-xs text-slate-500 mt-3">* 1차에서는 외부 URL만 사용합니다. 판매자 계정으로 로그인 후 이용하세요.</p>
    </div>
  );
}
