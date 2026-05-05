// 브라우저 저장소 기반 토큰 관리 유틸이다.

const ACCESS_TOKEN_KEY = "communitysite_access_token";
const REFRESH_TOKEN_KEY = "communitysite_refresh_token";
const AUTH_STORAGE_VERSION_KEY = "communitysite_auth_storage_version";
const AUTH_STORAGE_VERSION = "2026-05-04-v1";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type CookieUser = {
  id: number;
  operator_role?: string;
};

export function getStoredTokens() {
  if (typeof window === "undefined") {
    return { accessToken: "", refreshToken: "" };
  }

  const storageVersion = window.localStorage.getItem(AUTH_STORAGE_VERSION_KEY);
  if (storageVersion !== AUTH_STORAGE_VERSION) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.setItem(AUTH_STORAGE_VERSION_KEY, AUTH_STORAGE_VERSION);
    return { accessToken: "", refreshToken: "" };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "",
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? ""
  };
}

export function persistTokens(accessToken: string, refreshToken: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_VERSION_KEY, AUTH_STORAGE_VERSION);
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function persistAuthCookies(user: CookieUser | null) {
  if (typeof document === "undefined") {
    return;
  }

  if (!user) {
    document.cookie = "communitysite_logged_in=; Max-Age=0; Path=/; SameSite=Lax";
    document.cookie = "communitysite_operator_role=; Max-Age=0; Path=/; SameSite=Lax";
    return;
  }

  document.cookie = `communitysite_logged_in=1; Max-Age=${AUTH_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  document.cookie = `communitysite_operator_role=${encodeURIComponent(user.operator_role ?? "none")}; Max-Age=${AUTH_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function clearStoredTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_VERSION_KEY, AUTH_STORAGE_VERSION);
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}
