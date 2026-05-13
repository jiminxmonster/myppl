"use client";

import Link from "next/link";
import { MapPin, Heart, Package2 } from "lucide-react";

import { SafeImage } from "@/components/common/safe-image";
import { getProductPlaceholder, MarketplaceItem, resolveMediaUrl } from "@/lib/api";

type MarketplaceBoardProps = {
  initialItems: MarketplaceItem[];
};

export function MarketplaceBoard({ initialItems }: MarketplaceBoardProps) {
  if (initialItems.length === 0) {
    return (
      <section className="border border-[var(--border)] bg-white px-8 py-16 text-center shadow-soft">
        <p className="text-lg font-semibold text-slate-900">등록된 판매글이 아직 없습니다.</p>
        <p className="mt-2 text-sm text-slate-500">카테고리를 바꾸거나 첫 판매글을 올려보세요.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
      {initialItems.map((item) => (
        <article key={item.id} className="overflow-hidden border border-[var(--border)] bg-white shadow-soft transition-transform hover:-translate-y-1">
          <Link href={`/marketplace/${item.id}`} className="block">
            <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#f5f6f8]">
              <SafeImage
                src={resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name))}
                alt={`${item.title} 대표 이미지`}
                className="h-full w-full object-cover"
                seed={`market-${item.id}-${item.title}`}
              />
              <div className="absolute left-4 top-4 rounded-[5px] bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                {item.category_name ?? "중고장터"}
              </div>
              <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-[5px] bg-white text-slate-600 shadow-sm">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </Link>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
                {item.author_nickname}
              </p>
              <Link href={`/marketplace/${item.id}`} className="line-clamp-2 text-2xl font-bold leading-tight text-slate-900 hover:text-[var(--brand)]">
                {item.title}
              </Link>
            </div>
            <div>
              {item.original_price ? (
                <p className="text-sm font-semibold text-slate-400 line-through">
                  ₩{Number(item.original_price).toLocaleString("ko-KR")}
                </p>
              ) : null}
              <p className="text-2xl font-black text-[#35b15a]">
                ₩{Number(item.price).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {item.region}
              </span>
              <span className="inline-flex items-center gap-1">
                <Package2 className="h-4 w-4" />
                {item.status}
              </span>
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
