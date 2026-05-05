"use client";

import { useEffect, useMemo, useState } from "react";

import { getNotifications, markNotificationAsRead, NotificationItem } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

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

    const wsBase = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
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
