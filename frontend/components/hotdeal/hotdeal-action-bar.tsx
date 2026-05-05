"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getProductAlertSubscriptions } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function HotdealActionBar() {
  const [hasSavedHotdeal, setHasSavedHotdeal] = useState(false);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!isLoggedIn) {
      setHasSavedHotdeal(false);
      return;
    }

    const loadSubscriptions = async () => {
      try {
        const items = await getProductAlertSubscriptions();
        setHasSavedHotdeal(items.length > 0);
      } catch {
        setHasSavedHotdeal(false);
      }
    };

    void loadSubscriptions();
  }, [isLoggedIn]);

  const isOperator = ["moderator", "admin", "superadmin"].includes(user?.operator_role ?? "");

  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/hotdeals/subscribe" className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
        핫딜받기
      </Link>
      {hasSavedHotdeal ? (
        <Link href="/hotdeals/my" className="rounded-[5px] border border-[var(--border)] px-5 py-3 text-sm font-semibold text-slate-700">
          나의 핫딜
        </Link>
      ) : null}
      {isOperator ? (
        <Link href="/hotdeals/create" className="rounded-[5px] border border-[var(--border)] px-5 py-3 text-sm font-semibold text-slate-700">
          핫딜 등록
        </Link>
      ) : null}
    </div>
  );
}
