"use client";

import Link from "next/link";

import { useAuthStore } from "@/store/authStore";

export function ProductsActionBar() {
  const user = useAuthStore((state) => state.user);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {user?.member_type === "seller" ? (
        <Link href="/marketplace/sell" className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
          상품올리기+
        </Link>
      ) : null}
      {user?.member_type === "buyer" ? (
        <Link href="/wanted-products/new" className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
          원하는상품+
        </Link>
      ) : null}
    </div>
  );
}
