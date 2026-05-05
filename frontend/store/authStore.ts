import { create } from "zustand";

import { clearStoredTokens, persistAuthCookies, persistTokens } from "@/lib/auth";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  nickname: string;
  member_type: "buyer" | "seller";
  grade: string;
  operator_role: string;
  points: number;
  profile_image?: string | null;
  is_suspended: boolean;
  suspend_until?: string | null;
  suspend_public?: string;
  suspend_count: number;
  created_at: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string;
  refreshToken: string;
  isLoggedIn: boolean;
  isReady: boolean;
  login: (user: AuthUser, token: string, refreshToken: string) => void;
  restore: (user: AuthUser, token: string, refreshToken: string) => void;
  logout: () => void;
  markReady: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: "",
  refreshToken: "",
  isLoggedIn: false,
  isReady: false,
  login: (user, token, refreshToken) => {
    // 로그인 성공 시 로컬 저장소와 Zustand 상태를 함께 갱신한다.
    persistTokens(token, refreshToken);
    persistAuthCookies(user);
    set({ user, token, refreshToken, isLoggedIn: true, isReady: true });
  },
  restore: (user, token, refreshToken) => {
    // 이미 저장된 토큰이 있으면 사용자 정보만 다시 불러와 상태를 복원한다.
    persistAuthCookies(user);
    set({ user, token, refreshToken, isLoggedIn: true, isReady: true });
  },
  logout: () => {
    clearStoredTokens();
    persistAuthCookies(null);
    set({ user: null, token: "", refreshToken: "", isLoggedIn: false, isReady: true });
  },
  markReady: () => set({ isReady: true }),
}));
