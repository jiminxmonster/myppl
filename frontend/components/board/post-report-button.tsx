"use client";

import { useState } from "react";

import { createReport } from "@/lib/api";


export function PostReportButton({ postId }: { postId: number }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleReport = async () => {
    setLoading(true);
    setMessage("");
    try {
      await createReport({
        post: postId,
        reason: "other",
        detail: "상세 사유는 운영자가 확인해주세요.",
      });
      setMessage("신고가 접수되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "신고 접수에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleReport}
        disabled={loading}
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
      >
        {loading ? "신고 중..." : "신고"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
