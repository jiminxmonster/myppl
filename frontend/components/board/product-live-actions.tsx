"use client";

import { useState } from "react";
import { Copy, Radio, Share2 } from "lucide-react";

type ProductLiveActionsProps = {
  title: string;
  liveUrl: string;
};

export function ProductLiveActions({ title, liveUrl }: ProductLiveActionsProps) {
  const [status, setStatus] = useState("");

  async function handleShare() {
    setStatus("");

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: "라이브특가 방송 링크",
          url: liveUrl,
        });
        setStatus("공유 창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(liveUrl);
      setStatus("링크를 복사했습니다.");
    } catch {
      setStatus("공유를 완료하지 못했습니다. 링크를 직접 복사해 주세요.");
    }
  }

  async function handleCopy() {
    setStatus("");

    try {
      await navigator.clipboard.writeText(liveUrl);
      setStatus("링크를 복사했습니다.");
    } catch {
      setStatus("복사 권한을 확인해 주세요.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          <Radio className="h-4 w-4" />
          라이브 방송 보기
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
        >
          <Share2 className="h-4 w-4" />
          방송 링크 공유
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
        >
          <Copy className="h-4 w-4" />
          링크 복사
        </button>
      </div>
      {status ? <p className="text-sm font-semibold text-slate-600">{status}</p> : null}
    </div>
  );
}
