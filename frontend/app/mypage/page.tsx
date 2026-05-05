"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageNavigator } from "@/components/layout/page-navigator";
import { LogoutButton } from "@/components/profile/logout-button";
import { MyPageSummary, authApi, resolveMediaUrl } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function MyPage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isReady = useAuthStore((state) => state.isReady);
  const [summary, setSummary] = useState<MyPageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isLoggedIn) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    void authApi
      .mypage()
      .then((data) => {
        if (mounted) {
          setSummary(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setSummary(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, isReady]);

  if (!isReady || loading) {
    return (
      <section className="space-y-6">
        <PageNavigator
          items={[
            { label: "홈", href: "/" },
            { label: "마이페이지" },
          ]}
        />
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
          <h1 className="text-3xl font-bold">개인프로필</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">프로필 정보를 불러오는 중입니다.</p>
        </div>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="space-y-6">
        <PageNavigator
          items={[
            { label: "홈", href: "/" },
            { label: "마이페이지" },
          ]}
        />
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
          <h1 className="text-3xl font-bold">개인프로필</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">로그인 후 프로필과 로그아웃 메뉴를 확인할 수 있습니다.</p>
          <div className="mt-5">
            <Link href="/login" className="inline-flex rounded-[5px] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              로그인하기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const cards = [
    { label: "작성 글", value: summary.stats.total_posts },
    { label: "총 조회수", value: summary.stats.total_views },
    { label: "받은 추천", value: summary.stats.total_likes },
    { label: "결제 건수", value: summary.stats.total_payments },
    { label: "안 읽은 알림", value: summary.stats.unread_notifications },
  ];
  const profileLinks =
    summary.user.member_type === "seller"
      ? [
          { label: "내판매상품", href: "/seller-products" },
          { label: "상품 올리기", href: "/marketplace/sell" },
          { label: "상품 알림 설정", href: "/mypage/alerts" },
        ]
      : [
          { label: "원하는상품", href: "/wanted-products" },
          { label: "원하는상품 등록", href: "/wanted-products/new" },
          { label: "상품 알림 설정", href: "/mypage/alerts" },
        ];

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "마이페이지" },
        ]}
      />
      <div className="rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            {summary.user.profile_image ? (
              <img
                src={resolveMediaUrl(summary.user.profile_image)}
                alt={`${summary.user.nickname} 프로필 이미지`}
                className="h-20 w-20 rounded-[5px] border border-[var(--border)] object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[5px] bg-[var(--muted)] text-2xl font-bold text-[var(--brand)]">
                {summary.user.nickname.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{summary.user.nickname}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {summary.user.member_type === "seller" ? "판매자 계정" : "구매자 계정"} · 아이디 {summary.user.username}
              </p>
              <p className="text-sm leading-6 text-slate-600">
                등급 {summary.user.grade} · 포인트 {summary.user.points} · 가입일{" "}
                {new Date(summary.user.created_at).toLocaleDateString("ko-KR")}
              </p>
              <p className="text-sm leading-6 text-slate-600">이메일 {summary.user.email || "미입력"}</p>
              <p className="text-sm leading-6 text-slate-600">
                운영 권한 {summary.user.operator_role || "일반회원"}
                {summary.user.is_suspended ? ` · 현재 이용 제한 (${summary.user.suspend_public || "관리자 확인"})` : ""}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-semibold">개인프로필</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/25 px-4 py-4">
              <p className="text-sm text-slate-500">닉네임</p>
              <p className="mt-2 font-semibold text-[var(--ink)]">{summary.user.nickname}</p>
            </div>
            <div className="rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/25 px-4 py-4">
              <p className="text-sm text-slate-500">아이디</p>
              <p className="mt-2 font-semibold text-[var(--ink)]">{summary.user.username}</p>
            </div>
            <div className="rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/25 px-4 py-4">
              <p className="text-sm text-slate-500">회원 유형</p>
              <p className="mt-2 font-semibold text-[var(--ink)]">
                {summary.user.member_type === "seller" ? "판매자" : "구매자"}
              </p>
            </div>
            <div className="rounded-[5px] border border-[var(--border)] bg-[var(--muted)]/25 px-4 py-4">
              <p className="text-sm text-slate-500">이메일</p>
              <p className="mt-2 font-semibold text-[var(--ink)]">{summary.user.email || "미입력"}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-semibold">바로가기</h2>
          <div className="mt-6 space-y-3">
            {profileLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--muted)]"
              >
                <span>{item.label}</span>
                <span className="text-slate-400">이동</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[0.5rem] border border-[var(--border)] bg-white p-5 shadow-soft">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h2 className="text-2xl font-semibold">최근 작성 글</h2>
        <div className="mt-6 space-y-3">
          {summary.recent_posts.length > 0 ? (
            summary.recent_posts.map((post) => (
              <Link
                key={post.id}
                href={`/boards/${post.board_slug}/${post.id}`}
                className="flex flex-col gap-2 rounded-[1.25rem] bg-[var(--muted)]/50 p-4 hover:bg-[var(--muted)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">{post.title}</p>
                  <span className="text-xs text-slate-500">{post.board_name}</span>
                </div>
                <p className="text-xs text-slate-500">
                  조회 {post.views} · 추천 {post.likes} · {new Date(post.created_at).toLocaleString("ko-KR")}
                </p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-slate-500">아직 작성한 글이 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}
