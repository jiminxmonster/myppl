"use client";

import { useState } from "react";

import { purchaseMarketplaceItem } from "@/lib/api";

type MarketplaceDetailActionsProps = {
  itemId: number;
  purchaseRequestCount: number;
};

export function MarketplaceDetailActions({ itemId, purchaseRequestCount }: MarketplaceDetailActionsProps) {
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(purchaseRequestCount);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handlePurchaseRequest() {
    setLoading(true);
    setFeedback("");

    try {
      await purchaseMarketplaceItem(itemId, message);
      setCount((current) => current + 1);
      setMessage("");
      setFeedback("구매 요청을 보냈습니다.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "구매 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">구매 요청</h2>
          <p className="mt-2 text-sm text-slate-600">판매자에게 전달할 메시지를 남기고 구매 의사를 보낼 수 있습니다.</p>
        </div>
        <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2 text-sm font-semibold text-slate-700">
          요청 {count}건
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm"
          placeholder="구매 요청 메시지"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button
          type="button"
          onClick={() => void handlePurchaseRequest()}
          disabled={loading}
          className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "요청 중..." : "구매 요청"}
        </button>
      </div>
      {feedback ? <p className="mt-3 text-sm text-slate-600">{feedback}</p> : null}
    </section>
  );
}
