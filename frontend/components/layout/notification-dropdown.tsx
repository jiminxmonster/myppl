"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";

import { useNotification } from "@/hooks/use-notification";

export function NotificationDropdown() {
  const { isOpen, items, unreadCount, setIsOpen, markAsRead } = useNotification();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] px-4 py-2"
      >
        <Bell className="h-4 w-4" />
        알림
      </button>
      {unreadCount > 0 ? (
        <span className="absolute -right-2 -top-2 rounded-[5px] bg-[var(--accent)] px-2 py-0.5 text-xs font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
      {mounted && isOpen
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="알림창 닫기"
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[2147483646] cursor-default bg-black/5"
              />
              <div className="fixed right-4 top-4 z-[2147483647] w-[min(22rem,calc(100vw-2rem))] rounded-[5px] border border-[var(--border)] bg-white p-4 shadow-soft sm:right-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">실시간 알림</p>
                  <span className="text-xs text-slate-500">읽지 않음 {unreadCount}</span>
                </div>
                <div className="max-h-96 space-y-3 overflow-auto">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <div key={item.id} className="rounded-[5px] bg-[var(--muted)]/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          {item.target_url ? (
                            <Link
                              href={item.target_url}
                              onClick={() => {
                                if (!item.is_read) {
                                  markAsRead(item.id);
                                }
                                setIsOpen(false);
                              }}
                              className="min-w-0 flex-1"
                            >
                              <p className="text-sm font-semibold">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.message}</p>
                            </Link>
                          ) : (
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.message}</p>
                            </div>
                          )}
                          {!item.is_read ? (
                            <button
                              type="button"
                              onClick={() => markAsRead(item.id)}
                              className="text-xs font-semibold text-[var(--brand)]"
                            >
                              읽음
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">도착한 알림이 없습니다.</p>
                  )}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
