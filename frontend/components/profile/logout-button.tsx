"use client";

import { useRouter } from "next/navigation";

import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function LogoutButton() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 서버 세션은 없으므로 실패해도 클라이언트 로그아웃은 진행한다.
    } finally {
      logout();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700"
    >
      로그아웃
    </button>
  );
}
