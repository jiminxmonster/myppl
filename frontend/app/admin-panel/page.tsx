"use client";

import { useEffect, useState } from "react";

import { AdminDashboard, authApi } from "@/lib/api";


export default function AdminPanelHomePage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setDashboard(await authApi.adminDashboard());
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "운영자 대시보드를 불러오지 못했습니다.");
      }
    }

    void loadDashboard();
  }, []);

  if (error) {
    return <section className="rounded-[0.67rem] border border-red-200 bg-red-50 p-8 text-sm text-red-700">{error}</section>;
  }

  if (!dashboard) {
    return <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">대시보드를 불러오는 중입니다.</section>;
  }

  const statCards = [
    ["전체 회원", dashboard.stats.total_users],
    ["정지 회원", dashboard.stats.suspended_users],
    ["게시판", dashboard.stats.total_boards],
    ["숨김 게시판", dashboard.stats.hidden_boards],
    ["게시글", dashboard.stats.total_posts],
    ["블라인드 게시글", dashboard.stats.blinded_posts],
    ["처리대기 신고", dashboard.stats.pending_reports],
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map(([label, value]) => (
          <article key={label} className="rounded-[0.58rem] border border-[var(--border)] bg-white p-6 shadow-soft">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-4 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h2 className="text-xl font-bold">최근 운영 로그</h2>
        <div className="mt-5 divide-y divide-[var(--border)]">
          {dashboard.recent_admin_logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
              <div>
                <p className="font-semibold">{log.action}</p>
                <p className="mt-1 text-slate-500">대상 #{log.target_id} · 처리자 {log.admin_nickname}</p>
              </div>
              <p className="text-slate-500">{new Date(log.created_at).toLocaleString("ko-KR")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
