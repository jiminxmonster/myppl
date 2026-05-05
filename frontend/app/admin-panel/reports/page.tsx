"use client";

import { useEffect, useState } from "react";

import { AdminReport, blindAdminPost, getAdminReports, handleAdminReport } from "@/lib/api";


export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  useEffect(() => {
    void loadReports(statusFilter, emergencyOnly);
  }, [statusFilter, emergencyOnly]);

  async function loadReports(status = "", emergency = false) {
    try {
      setReports(await getAdminReports(status, emergency));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "신고 목록을 불러오지 못했습니다.");
    }
  }

  async function handleReport(report: AdminReport, nextStatus: "resolved" | "dismissed") {
    const updated = await handleAdminReport(report.id, {
      status: nextStatus,
      handled_note: nextStatus === "resolved" ? "운영자 패널에서 처리 완료" : "운영자 검토 후 기각",
      blind_target: nextStatus === "resolved" && report.is_emergency,
    });
    setReports((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function blindPostAndResolve(report: AdminReport) {
    if (report.post) {
      await blindAdminPost(report.post, { is_blinded: true, blind_reason: report.reason });
    }
    await handleAdminReport(report.id, {
      status: "resolved",
      handled_note: "운영자 패널에서 블라인드 후 처리",
      blind_target: !report.post,
    });
    await loadReports(statusFilter, emergencyOnly);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">신고 처리</h1>
        <p className="mt-3 text-sm text-slate-600">접수된 신고를 검토하고 블라인드 또는 기각 처리를 진행합니다.</p>
      </section>
      <section className="flex gap-3 rounded-[0.67rem] border border-[var(--border)] bg-white p-5 shadow-soft">
        <button type="button" onClick={() => setStatusFilter("")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">전체</button>
        <button type="button" onClick={() => setStatusFilter("pending")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">처리대기</button>
        <button type="button" onClick={() => setStatusFilter("resolved")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">처리완료</button>
        <button type="button" onClick={() => setStatusFilter("dismissed")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">기각</button>
        <button type="button" onClick={() => setEmergencyOnly((current) => !current)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
          {emergencyOnly ? "긴급만 해제" : "긴급 신고만"}
        </button>
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <section className="grid gap-4">
        {reports.map((report) => (
          <article key={report.id} className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">
                  {report.status} {report.is_emergency ? "· 긴급" : ""}
                </p>
                <h2 className="mt-2 text-xl font-bold">{report.post_title || "댓글 신고"}</h2>
                <p className="mt-2 text-sm text-slate-600">신고자 {report.reporter_nickname} · 사유 {report.reason} · 누적 대기 {report.pending_count}건 · {new Date(report.created_at).toLocaleString("ko-KR")}</p>
              </div>
              {report.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  {report.post ? (
                    <button type="button" onClick={() => void blindPostAndResolve(report)} className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
                      블라인드 후 처리
                    </button>
                  ) : null}
                  <button type="button" onClick={() => void handleReport(report, "resolved")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                    처리완료
                  </button>
                  <button type="button" onClick={() => void handleReport(report, "dismissed")} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                    기각
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 rounded-[0.5rem] bg-[var(--muted)] p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold">신고 상세</p>
              <p className="mt-2 whitespace-pre-wrap">{report.detail || "추가 상세 없음"}</p>
              {report.comment_content ? (
                <p className="mt-4 text-slate-600">댓글 원문: {report.comment_content}</p>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
