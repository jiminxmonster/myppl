"use client";

import { useEffect, useMemo, useState } from "react";

import { getNotifications, markNotificationAsRead, NotificationItem } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

function resolveWebSocketBaseUrl() {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
      apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
      apiUrl.pathname = "/ws";
      apiUrl.search = "";
      apiUrl.hash = "";
      return apiUrl.toString().replace(/\/$/, "");
    } catch {
      // Fall through to the local development default.
    }
  }

  return "ws://localhost:8000/ws";
}

export function useNotification() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let socket: WebSocket | null = null;

    const load = async () => {
      const fetched = await getNotifications().catch(() => []);
      setItems(fetched);
    };

    load();

    const wsBase = resolveWebSocketBaseUrl();
    socket = new WebSocket(`${wsBase}/notifications/?user_id=${user.id}`);

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as NotificationItem;
      setItems((current) => [payload, ...current]);
    };

    return () => {
      socket?.close();
    };
  }, [user]);

  const unreadCount = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  const markAsRead = async (notificationId: number) => {
    const updated = await markNotificationAsRead(notificationId);
    setItems((current) => current.map((item) => (item.id === notificationId ? updated : item)));
  };

  return {
    isOpen,
    items,
    unreadCount,
    setIsOpen,
    markAsRead,
  };
}
