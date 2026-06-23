"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api";

type Room = any;
type Message = { id: number; nickname: string; message: string; created_at: string };

export default function LiveDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await apiClient.get(`/live/${id}/`);
      setRoom(res.data);
      // recent messages
      const m = await apiClient.get(`/live/${id}/messages/`);
      setMessages(m.data.results || m.data || []);
    }
    load();
  }, [id]);

  // WebSocket chat (simple)
  useEffect(() => {
    if (!id || !room?.chat_enabled) return;
    const token = localStorage.getItem('communitysite_access_token') || '';
    if (!token) return; // non login no chat for now

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live/${id}/chat/?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("chat ws open");
    };
    socket.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === "message") {
        setMessages((prev) => [...prev, data.message]);
      } else if (data.type === "recent") {
        setMessages(data.messages || []);
      }
    };
    setWs(socket);

    return () => socket.close();
  }, [id, room]);

  async function sendChat() {
    if (!chatInput.trim() || !id) return;
    try {
      await apiClient.post(`/live/${id}/messages/create/`, { message: chatInput.trim() });
      setChatInput("");
      // ws will push, or fallback poll
    } catch (e) {
      alert("채팅 전송 실패 (로그인 필요할 수 있음)");
    }
  }

  if (!room) return <div className="p-8">로딩 중...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 grid gap-4 lg:grid-cols-3">
      {/* Video */}
      <div className="lg:col-span-2">
        <div className="aspect-video bg-black rounded overflow-hidden">
          {room.embed_url ? (
            <iframe
              src={room.embed_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : room.live_url ? (
            <a href={room.live_url} target="_blank" className="text-white p-4 block">외부 링크로 이동: {room.live_url}</a>
          ) : <div className="text-white p-4">라이브 URL 없음</div>}
        </div>
        <h1 className="text-2xl font-bold mt-3">{room.title}</h1>
        <p className="text-slate-600">{room.description}</p>
      </div>

      {/* Chat */}
      <div className="border rounded p-3 flex flex-col h-[400px] lg:h-auto">
        <div className="font-semibold mb-2">채팅</div>
        <div className="flex-1 overflow-auto text-sm space-y-1 mb-2">
          {messages.map((m, i) => (
            <div key={i}><b>{m.nickname}:</b> {m.message}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            className="flex-1 border px-2 py-1 rounded text-sm"
            placeholder="메시지 입력 (로그인 필요)"
          />
          <button onClick={sendChat} className="px-3 py-1 bg-[var(--brand)] text-white rounded text-sm">전송</button>
        </div>
      </div>

      {/* Products */}
      <div className="lg:col-span-3">
        <h3 className="font-semibold mb-2">연결 상품</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(room.products || []).map((p: any, idx: number) => (
            <a key={idx} href={p.external_url || "#"} target="_blank" className="block border p-2 rounded">
              {p.image && <img src={p.image} className="w-full h-28 object-cover" />}
              <div className="text-sm font-medium mt-1">{p.title}</div>
              <div className="text-[var(--brand)] text-sm">{p.price}</div>
            </a>
          ))}
          {(!room.products || room.products.length === 0) && <div className="text-sm text-slate-500">연결된 상품이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}
