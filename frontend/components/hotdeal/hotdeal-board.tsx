"use client";

import Link from "next/link";
import { Clock3, Heart, Star } from "lucide-react";

import { SafeImage } from "@/components/common/safe-image";
import { getProductPlaceholder, Hotdeal, resolveMediaUrl } from "@/lib/api";

type HotdealBoardProps = {
  initialItems: Hotdeal[];
};

export function HotdealBoard({ initialItems }: HotdealBoardProps) {
  if (initialItems.length === 0) {
    return (
      <section className="border border-[var(--border)] bg-white px-8 py-16 text-center shadow-soft">
        <p className="text-lg font-semibold text-slate-900">등록된 핫딜이 아직 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">카테고리를 바꾸거나 조금 뒤 다시 확인해 주세요.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
      {initialItems.map((item) => (
        <article key={item.id} className="overflow-hidden border border-[var(--border)] bg-white shadow-soft transition-transform hover:-translate-y-1">
          <Link href={`/hotdeals/${item.id}`} className="block">
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#f3f7f5]">
              <SafeImage
                src={item.image ? resolveMediaUrl(item.image) : getProductPlaceholder("hotdeal", item.category_name)}
                alt={`${item.title} 대표 이미지`}
                className="h-full w-full object-cover"
                seed={`hotdeal-${item.id}-${item.title}`}
              />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-[5px] bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                <span>{item.status === "expired" ? "마감" : "핫딜"}</span>
              </div>
              <div className="absolute right-4 top-4 rounded-[5px] bg-[#49c861] px-3 py-2 text-lg font-bold text-white">
                -{item.discount_rate}%
              </div>
              <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-[5px] bg-white text-slate-600 shadow-sm">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </Link>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                {item.category_name ?? "핫딜"} · {item.author_nickname}
              </p>
              <Link href={`/hotdeals/${item.id}`} className="line-clamp-2 text-2xl font-bold leading-tight text-slate-900 hover:text-[var(--brand)]">
                {item.title}
              </Link>
            </div>
            <div>
              <p className="text-2xl font-black text-[#35b15a]">
                ₩{Number(item.sale_price).toLocaleString()}
              </p>
              <p className="mt-1 text-lg text-slate-400 line-through">
                ₩{Number(item.original_price).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                <Star className="h-4 w-4 fill-[#facc15] text-[#facc15]" />
                4.8
              </span>
              <span>핫딜 등록 {new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-[5px] bg-[#eef9f5] px-4 py-3 text-sm font-semibold text-[#2e7d69]">
              <Clock3 className="h-4 w-4" />
              {item.status === "expired" ? "마감된 핫딜" : "지금 바로 확인 가능"}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
