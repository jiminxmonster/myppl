"use client";

import { useEffect, useState } from "react";

import { AdminDashboard, authApi } from "@/lib/api";


export default function AdminPanelHomePage() {
  // 모든 hook은 컴포넌트 최상단에서, 어떤 early return보다도 먼저 선언해야 합니다.
  // (Rules of Hooks 위반 방지: "Rendered more hooks than during the previous render")
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");

  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [specsCode, setSpecsCode] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

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

  async function handleMakePermanentDefault() {
    try {
      const res = await authApi.exportBootstrapSpecs();
      setSpecsCode(res.specs_code);
      setShowSpecsModal(true);
      setCopySuccess(false);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.message || "알 수 없는 오류";
      alert(`스펙 추출에 실패했습니다.\n${detail}\n(로그인 상태와 권한 확인)`);
    }
  }

  // (handlers are regular functions, not hooks — 위치는 상관없지만 가독성을 위해 상태 바로 아래에 둠)

  function handleCopySpecs() {
    navigator.clipboard.writeText(specsCode).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }

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

      {/* 영구 기본값 버튼 섹션 */}
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h2 className="text-xl font-bold mb-2">부트스트랩 기본값 업데이트</h2>
        <p className="text-sm text-slate-500 mb-4">
          admin에서 메뉴/섹션 등을 정리한 현재 상태를 부트스트랩 코드의 영구 기본값으로 만듭니다.
          <br />나중에 새 환경 배포 시 이 상태로 초기화됩니다.
        </p>
        <button
          onClick={handleMakePermanentDefault}
          className="rounded-2xl bg-[var(--brand)] px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          현재 admin 상태를 부트스트랩 기본값으로 만들기
        </button>
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

      {/* Specs Modal */}
      {showSpecsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">부트스트랩 스펙 코드 (현재 admin 상태)</h3>
                <p className="text-sm text-slate-500">이 내용을 bootstrap_community.py 의 board_specs / section_specs 에 붙여넣고 commit &amp; push 하세요.</p>
              </div>
              <button
                onClick={() => setShowSpecsModal(false)}
                className="text-xl leading-none text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <pre className="mb-4 max-h-[50vh] overflow-auto rounded bg-slate-100 p-4 text-xs text-slate-800 whitespace-pre-wrap">
              {specsCode}
            </pre>

            <div className="flex gap-3">
              <button
                onClick={handleCopySpecs}
                className="rounded-2xl bg-[var(--brand)] px-5 py-2.5 font-semibold text-white hover:opacity-90"
              >
                {copySuccess ? "복사됨!" : "코드 클립보드에 복사"}
              </button>
              <button
                onClick={() => setShowSpecsModal(false)}
                className="rounded-2xl border px-5 py-2.5 font-semibold hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <p className="mt-3 text-[10px] text-slate-400">
              이 버튼을 누르면 현재 admin의 모든 게시판 상위노출 / 홈 섹션 상태가 코드의 새로운 기본값이 됩니다.
              다음 배포나 새 환경에서 bootstrap이 이 상태를 사용합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
