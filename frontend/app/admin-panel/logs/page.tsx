"use client";

import { useEffect, useState } from "react";

import { AdminLogItem, getAdminLogs } from "@/lib/api";


export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLogs() {
      try {
        setLogs(await getAdminLogs());
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "운영 로그를 불러오지 못했습니다.");
      }
    }

    void loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">운영 로그</h1>
        <p className="mt-3 text-sm text-slate-600">운영자 행위 이력을 최근 100건까지 조회합니다.</p>
      </section>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
        <div className="divide-y divide-[var(--border)]">
          {logs.map((log) => (
            <article key={log.id} className="flex flex-wrap items-start justify-between gap-4 py-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold">{log.action}</p>
                <p className="text-slate-500">대상 #{log.target_id} · 처리자 {log.admin_nickname} · IP {log.ip_address ?? "-"}</p>
                <pre className="overflow-x-auto rounded-xl bg-[var(--muted)] p-3 text-xs text-slate-600">{JSON.stringify(log.detail, null, 2)}</pre>
              </div>
              <p className="text-slate-500">{new Date(log.created_at).toLocaleString("ko-KR")}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
