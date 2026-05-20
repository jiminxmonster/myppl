"use client";

import { useEffect } from "react";

import type { ProductLiveStatus } from "@/lib/api";
import { productLiveStatusOptions } from "@/lib/live-broadcast";
import { inferShoppingMallName, shoppingMallOptions } from "@/lib/shopping-mall";

type LiveBroadcastFieldsProps = {
  liveUrl: string;
  storeName: string;
  platform: string;
  channel: string;
  startsAt: string;
  endsAt: string;
  status: ProductLiveStatus;
  benefit: string;
  buttonLabel: string;
  onLiveUrlChange: (value: string) => void;
  onStoreNameChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onEndsAtChange: (value: string) => void;
  onStatusChange: (value: ProductLiveStatus) => void;
  onBenefitChange: (value: string) => void;
  onButtonLabelChange: (value: string) => void;
};

const inputClass = "w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none";

export function LiveBroadcastFields({
  liveUrl,
  storeName,
  platform,
  channel,
  startsAt,
  endsAt,
  status,
  benefit,
  buttonLabel,
  onLiveUrlChange,
  onStoreNameChange,
  onPlatformChange,
  onChannelChange,
  onStartsAtChange,
  onEndsAtChange,
  onStatusChange,
  onBenefitChange,
  onButtonLabelChange,
}: LiveBroadcastFieldsProps) {
  const inferredStoreName = inferShoppingMallName(liveUrl);

  useEffect(() => {
    if (inferredStoreName && !storeName.trim()) {
      onStoreNameChange(inferredStoreName);
    }
  }, [inferredStoreName, onStoreNameChange, storeName]);

  return (
    <div className="space-y-4 rounded-[0.5rem] border border-[var(--border)] bg-slate-50 p-4 md:col-span-2">
      <div>
        <p className="text-sm font-bold text-[var(--ink)]">라이브 방송 정보</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium">타사 라이브 방송 링크</span>
          <input
            type="url"
            className={inputClass}
            placeholder="https://..."
            value={liveUrl}
            onChange={(event) => onLiveUrlChange(event.target.value)}
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium">해당 쇼핑몰 이름</span>
          <input
            className={inputClass}
            list="shopping-mall-name-options"
            placeholder={inferredStoreName || "예: 네이버쇼핑, 쿠팡, 브랜드 공식몰"}
            value={storeName}
            onChange={(event) => onStoreNameChange(event.target.value)}
          />
          <datalist id="shopping-mall-name-options">
            {shoppingMallOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-2">
            {shoppingMallOptions.slice(0, 8).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  storeName === option ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-white text-slate-600"
                }`}
                onClick={() => onStoreNameChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">방송 플랫폼</span>
          <input
            className={inputClass}
            placeholder="예: 네이버 쇼핑라이브, 쿠팡라이브"
            value={platform}
            onChange={(event) => onPlatformChange(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">채널명</span>
          <input
            className={inputClass}
            placeholder="예: 브랜드 공식 채널"
            value={channel}
            onChange={(event) => onChannelChange(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">방송 시작</span>
          <input
            type="datetime-local"
            className={inputClass}
            value={startsAt}
            onChange={(event) => onStartsAtChange(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">방송 종료</span>
          <input
            type="datetime-local"
            className={inputClass}
            value={endsAt}
            onChange={(event) => onEndsAtChange(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">방송 상태</span>
          <select className={inputClass} value={status} onChange={(event) => onStatusChange(event.target.value as ProductLiveStatus)}>
            {productLiveStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">버튼 문구</span>
          <input
            className={inputClass}
            placeholder="라이브 보기"
            value={buttonLabel}
            onChange={(event) => onButtonLabelChange(event.target.value)}
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium">라이브 혜택 문구</span>
          <input
            className={inputClass}
            placeholder="예: 방송 중 구매 시 추가 10% 할인"
            value={benefit}
            onChange={(event) => onBenefitChange(event.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
