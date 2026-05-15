import type { ProductLiveStatus } from "@/lib/api";

export const productLiveStatusOptions: { value: ProductLiveStatus; label: string }[] = [
  { value: "scheduled", label: "예정" },
  { value: "on_air", label: "진행중" },
  { value: "ended", label: "종료" },
  { value: "replay", label: "다시보기" },
];

const productLiveStatusLabelMap = productLiveStatusOptions.reduce<Record<ProductLiveStatus, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<ProductLiveStatus, string>);

export function getProductLiveStatusLabel(status?: ProductLiveStatus | "" | null) {
  return status ? productLiveStatusLabelMap[status] ?? "예정" : "예정";
}

export function formatKoreanDateTime(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
}
