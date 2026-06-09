"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { authApi, extractApiError, getApiBaseUrl } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 로그인 응답의 사용자 정보와 토큰을 전역 상태에 저장한다.
      const data = await authApi.login(form);
      login(data.user, data.access, data.refresh);
      router.push("/");
    } catch (submitError) {
      const message = extractApiError(submitError, "로그인에 실패했습니다. 입력값을 다시 확인해주세요.");
      const target = getApiBaseUrl();
      setError(`${message.message} (대상: ${target})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
      <h1 className="text-3xl font-bold">로그인</h1>
      <p className="mt-2 text-sm text-slate-600">구매자와 판매자 계정으로 로그인해 역할별 메뉴와 기능을 사용할 수 있습니다.</p>
      <div className="mt-4 rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/45 p-4 text-sm text-slate-600">
        <p>기본 테스트 계정</p>
        <p className="mt-1">구매자: <strong>buy / buy</strong></p>
        <p>판매자: <strong>sell / sell</strong></p>
        <p>운영자: <strong>admin / admin</strong></p>
        <p className="mt-2 text-[10px] text-slate-400 break-all">API: {getApiBaseUrl()}</p>
      </div>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">아이디</span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">비밀번호</span>
          <input
            type="password"
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--brand)] px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <SocialLoginButtons />
    </section>
  );
}
