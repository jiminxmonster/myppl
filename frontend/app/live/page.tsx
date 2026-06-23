"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";

type LiveRoom = {
  id: number;
  title: string;
  status: string;
  starts_at?: string;
  thumbnail_url?: string;
  product_count?: number;
};

export default function LiveListPage() {
  const [rooms, setRooms] = useState<{ live: LiveRoom[]; scheduled: LiveRoom[]; ended: LiveRoom[] }>({
    live: [],
    scheduled: [],
    ended: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [liveRes, schedRes, endedRes] = await Promise.all([
          apiClient.get("/live/?status=live"),
          apiClient.get("/live/?status=scheduled"),
          apiClient.get("/live/?status=ended"),
        ]);
        setRooms({
          live: liveRes.data.results || liveRes.data || [],
          scheduled: schedRes.data.results || schedRes.data || [],
          ended: endedRes.data.results || endedRes.data || [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8">로딩 중...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">방송</h1>
        <Link href="/live/create" className="rounded bg-[var(--accent)] px-4 py-2 text-white font-semibold">
          방송하기
        </Link>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-3">라이브 중</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.live.length ? rooms.live.map(r => <LiveCard key={r.id} room={r} />) : <p>현재 라이브 중인 방송이 없습니다.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">예정 방송</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.scheduled.length ? rooms.scheduled.map(r => <LiveCard key={r.id} room={r} />) : <p>예정된 방송이 없습니다.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">종료 방송</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.ended.length ? rooms.ended.map(r => <LiveCard key={r.id} room={r} />) : <p>종료된 방송이 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}

function LiveCard({ room }: { room: LiveRoom }) {
  return (
    <Link href={`/live/${room.id}`} className="block rounded border p-3 hover:shadow">
      {room.thumbnail_url && <img src={room.thumbnail_url} alt="" className="w-full h-40 object-cover rounded mb-2" />}
      <div className="font-semibold">{room.title}</div>
      <div className="text-sm text-slate-500">{room.status} · {room.starts_at ? new Date(room.starts_at).toLocaleString() : ""}</div>
      <div className="text-xs">연결 상품 {room.product_count || 0}개</div>
    </Link>
  );
}
