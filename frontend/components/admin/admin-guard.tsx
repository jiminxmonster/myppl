"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";


export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isReady = useAuthStore((state) => state.isReady);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!["moderator", "admin", "superadmin"].includes(user.operator_role)) {
      router.replace("/");
    }
  }, [isReady, router, user]);

  if (!isReady) {
    return <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">운영자 권한을 확인하는 중입니다.</section>;
  }

  if (!user || !["moderator", "admin", "superadmin"].includes(user.operator_role)) {
    return <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">운영자 권한을 확인하는 중입니다.</section>;
  }

  return <>{children}</>;
}
