"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { authApi, extractApiError, getApiBaseUrl } from "@/lib/api";

const initialForm: {
  username: string;
  email: string;
  nickname: string;
  member_type: "buyer" | "seller";
  password: string;
  password_confirm: string;
} = {
  username: "",
  email: "",
  nickname: "",
  member_type: "buyer",
  password: "",
  password_confirm: ""
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.password_confirm) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      // 회원가입 성공 후 로그인 화면으로 이동시킨다.
      await authApi.register(form);
      router.push("/login");
    } catch (submitError) {
      const message = extractApiError(submitError, "회원가입에 실패했습니다. 중복된 아이디 또는 이메일인지 확인해주세요.");
      const target = getApiBaseUrl();
      setError(`${message.message} (대상: ${target})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
      <h1 className="text-3xl font-bold">회원가입</h1>
      <p className="mt-2 text-sm text-slate-600">아이디, 이메일, 닉네임을 입력해 커뮤니티 계정을 생성합니다.</p>
      <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">회원 유형</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-[5px] border px-4 py-3 text-left ${form.member_type === "buyer" ? "border-[var(--brand)] bg-[var(--muted)] text-[var(--brand)]" : "border-[var(--border)] bg-white"}`}
              onClick={() => setForm((current) => ({ ...current, member_type: "buyer" }))}
            >
              <strong className="block">구매자</strong>
              <span className="mt-1 block text-sm text-slate-600">원하는 상품과 알림을 저장하는 계정</span>
            </button>
            <button
              type="button"
              className={`rounded-[5px] border px-4 py-3 text-left ${form.member_type === "seller" ? "border-[var(--brand)] bg-[var(--muted)] text-[var(--brand)]" : "border-[var(--border)] bg-white"}`}
              onClick={() => setForm((current) => ({ ...current, member_type: "seller" }))}
            >
              <strong className="block">판매자</strong>
              <span className="mt-1 block text-sm text-slate-600">상품을 등록하고 내판매상품을 관리하는 계정</span>
            </button>
          </div>
        </div>
        <label className="block space-y-2 sm:col-span-1">
          <span className="text-sm font-medium">아이디</span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
          />
        </label>
        <label className="block space-y-2 sm:col-span-1">
          <span className="text-sm font-medium">닉네임</span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            value={form.nickname}
            onChange={(event) => setForm((current) => ({ ...current, nickname: event.target.value }))}
          />
        </label>
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium">이메일</span>
          <input
            type="email"
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label className="block space-y-2 sm:col-span-1">
          <span className="text-sm font-medium">비밀번호</span>
          <input
            type="password"
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
        </label>
        <label className="block space-y-2 sm:col-span-1">
          <span className="text-sm font-medium">비밀번호 확인</span>
          <input
            type="password"
            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none"
            value={form.password_confirm}
            onChange={(event) =>
              setForm((current) => ({ ...current, password_confirm: event.target.value }))
            }
          />
        </label>
        {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="sm:col-span-2 rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "가입 처리 중..." : "회원가입"}
        </button>
      </form>
      <SocialLoginButtons />
    </section>
  );
}
