"use client";

import { useEffect } from "react";

import { authApi } from "@/lib/api";
import { getStoredTokens } from "@/lib/auth";
import { useAuthStore } from "@/store/authStore";

export function AuthBootstrap() {
  const user = useAuthStore((state) => state.user);
  const restore = useAuthStore((state) => state.restore);
  const logout = useAuthStore((state) => state.logout);
  const markReady = useAuthStore((state) => state.markReady);

  useEffect(() => {
    if (user) {
      markReady();
      return;
    }

    const { accessToken, refreshToken } = getStoredTokens();
    if (!accessToken) {
      markReady();
      return;
    }

    let cancelled = false;

    const hydrate = async () => {
      try {
        // 새로고침 이후에도 저장된 토큰으로 사용자 상태를 복원한다.
        const me = await authApi.me();
        if (!cancelled) {
          restore(me, accessToken, refreshToken);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [logout, markReady, restore, user]);

  return null;
}
