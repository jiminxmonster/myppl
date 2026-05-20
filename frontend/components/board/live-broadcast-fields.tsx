import type { ProductLiveStatus } from "@/lib/api";
import { productLiveStatusOptions } from "@/lib/live-broadcast";

type LiveBroadcastFieldsProps = {
  platform: string;
  channel: string;
  startsAt: string;
  endsAt: string;
  status: ProductLiveStatus;
  benefit: string;
  buttonLabel: string;
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
  platform,
  channel,
  startsAt,
  endsAt,
  status,
  benefit,
  buttonLabel,
  onPlatformChange,
  onChannelChange,
  onStartsAtChange,
  onEndsAtChange,
  onStatusChange,
  onBenefitChange,
  onButtonLabelChange,
}: LiveBroadcastFieldsProps) {
  return (
    <div className="space-y-4 rounded-[0.5rem] border border-[var(--border)] bg-slate-50 p-4 md:col-span-2">
      <div>
        <p className="text-sm font-bold text-[var(--ink)]">라이브 방송 정보</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
