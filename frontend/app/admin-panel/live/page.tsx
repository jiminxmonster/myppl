"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

type Live = any;

export default function AdminLivePage() {
  const [rooms, setRooms] = useState<Live[]>([]);
  const [settings, setSettings] = useState<{ show_live_menu: boolean }>({ show_live_menu: false });

  const load = async () => {
    const [list, set] = await Promise.all([
      apiClient.get("/live/admin/").then(r => r.data.results || r.data),
      apiClient.get("/live/admin/settings/").then(r => r.data),
    ]);
    setRooms(list);
    setSettings(set);
  };

  useEffect(() => { load(); }, []);

  async function toggleMenu() {
    const updated = await apiClient.patch("/live/admin/settings/", { show_live_menu: !settings.show_live_menu });
    setSettings(updated.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">방송 관리</h1>

      <div className="rounded border p-4 bg-white">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.show_live_menu} onChange={toggleMenu} />
          상단 메뉴에 "방송" 표시 (ON/OFF)
        </label>
      </div>

      <div>
        <a href="/live/create" className="inline-block rounded bg-[var(--brand)] px-4 py-2 text-white">새 방송 만들기</a>
      </div>

      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-slate-50">
            <th className="p-2 text-left">제목</th>
            <th>상태</th>
            <th>시작</th>
            <th>채팅</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.title}</td>
              <td>{r.status}</td>
              <td>{r.starts_at ? new Date(r.starts_at).toLocaleString() : "-"}</td>
              <td>{r.chat_enabled ? "ON" : "OFF"}</td>
              <td>
                <a href={`/live/${r.id}`} className="text-blue-600 mr-2">보기</a>
                <a href={`/live/create?edit=${r.id}`} className="text-blue-600">수정</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
