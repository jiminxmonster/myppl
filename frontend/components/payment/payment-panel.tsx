"use client";

import { FormEvent, useState } from "react";

import { Payment, preparePayment, verifyPayment } from "@/lib/api";

type PaymentPanelProps = {
  marketplaceItemId?: number;
  amount?: string;
};

export function PaymentPanel({ marketplaceItemId, amount }: PaymentPanelProps) {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      // MVP 단계에서는 포트원 SDK 연결 대신 주문 생성 후 검증 흐름만 우선 제공한다.
      const prepared = await preparePayment({
        marketplace_item_id: marketplaceItemId,
        amount,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
      });

      const verified = await verifyPayment({
        merchant_uid: prepared.portone.merchant_uid,
        payment_key: `mock_${prepared.portone.merchant_uid}`,
        status: "paid",
      });
      setLatestPayment(verified);
    } catch {
      setError("결제 준비 또는 검증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
      <h2 className="text-2xl font-semibold">결제 준비</h2>
      <p className="mt-2 text-sm text-slate-600">
        현재는 PortOne 실연동 전 단계라 주문 생성과 결제 완료 상태 반영 API를 먼저 연결한 상태입니다.
      </p>
      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          className="rounded-2xl border border-[var(--border)] px-4 py-3"
          placeholder="구매자 이름"
          value={buyerName}
          onChange={(event) => setBuyerName(event.target.value)}
        />
        <input
          className="rounded-2xl border border-[var(--border)] px-4 py-3"
          placeholder="구매자 이메일"
          type="email"
          value={buyerEmail}
          onChange={(event) => setBuyerEmail(event.target.value)}
        />
        {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2"
        >
          {loading ? "결제 처리 중..." : "결제 요청"}
        </button>
      </form>
      {latestPayment ? (
        <div className="mt-6 rounded-[0.5rem] bg-[var(--muted)]/60 p-4 text-sm">
          <p className="font-semibold">최근 결제</p>
          <p className="mt-2">주문번호: {latestPayment.merchant_uid}</p>
          <p>상태: {latestPayment.status}</p>
          <p>금액: {Number(latestPayment.amount).toLocaleString()}원</p>
        </div>
      ) : null}
    </section>
  );
}
