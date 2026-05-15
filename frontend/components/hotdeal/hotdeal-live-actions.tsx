"use client";

import { useState } from "react";
import { Copy, Radio, Share2, ShoppingBag } from "lucide-react";

type HotdealLiveActionsProps = {
  title: string;
  sourceUrl: string;
  liveUrl?: string;
};

export function HotdealLiveActions({ title, sourceUrl, liveUrl }: HotdealLiveActionsProps) {
  const [status, setStatus] = useState("");
  const shareTarget = liveUrl || sourceUrl;
  const shareLabel = liveUrl ? "방송 링크 공유" : "구매 링크 공유";

  async function handleShare() {
    setStatus("");

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: liveUrl ? "라이브 방송 링크" : "구매 링크",
          url: shareTarget,
        });
        setStatus("공유 창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(shareTarget);
      setStatus("링크를 복사했습니다.");
    } catch {
      setStatus("공유를 완료하지 못했습니다. 링크를 직접 복사해 주세요.");
    }
  }

  async function handleCopy() {
    setStatus("");

    try {
      await navigator.clipboard.writeText(shareTarget);
      setStatus("링크를 복사했습니다.");
    } catch {
      setStatus("복사 권한을 확인해 주세요.");
    }
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex flex-wrap gap-3">
        {liveUrl ? (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
          >
            <Radio className="h-4 w-4" />
            라이브 방송 보기
          </a>
        ) : null}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-[5px] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
        >
          <ShoppingBag className="h-4 w-4" />
          구매 링크 이동
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
        >
          <Share2 className="h-4 w-4" />
          {shareLabel}
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
