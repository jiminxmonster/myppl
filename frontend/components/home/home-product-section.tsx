"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SafeImage } from "@/components/common/safe-image";

type HomeProductCard = {
  id: number;
  title: string;
  subtitle: string;
  image?: string;
  href: string;
  price?: string;
  originalPrice?: string;
};

type DisplayCard = HomeProductCard & {
  isPlaceholder?: boolean;
  placeholderTone?: string;
};

const PLACEHOLDER_TONES = [
  "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
  "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
  "linear-gradient(135deg, #fae8ff 0%, #e9d5ff 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
  "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
];

export function HomeProductSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: HomeProductCard[];
}) {
  const minimumDeckCount = 12;

  const paddedItems = useMemo<DisplayCard[]>(() => {
    if (items.length >= minimumDeckCount) {
      return items;
    }

    const placeholders = Array.from({ length: minimumDeckCount - items.length }, (_, index) => ({
      id: 100000 + index,
      title: `추천 상품 슬롯 ${String(index + 1).padStart(2, "0")}`,
      subtitle: "추가 상품이 여기에 자동으로 채워집니다",
      href: "#",
      price: "업데이트 대기",
      isPlaceholder: true,
      placeholderTone: PLACEHOLDER_TONES[index % PLACEHOLDER_TONES.length],
    }));

    return [...items, ...placeholders];
  }, [items]);

  const deck = useMemo(() => [...paddedItems, ...paddedItems], [paddedItems]);
  const animationSeconds = Math.max(36, paddedItems.length * 5);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 overflow-hidden">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--ink)]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="relative overflow-hidden">
        <div
          className="home-product-marquee flex w-max gap-4"
          style={{
            animationDuration: `${animationSeconds}s`,
          }}
        >
          {deck.map((item, index) => {
            const cardClassName =
              "block w-[220px] shrink-0 overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-1 sm:w-[250px] lg:w-[270px]";

            const cardContent = (
              <>
                <div
                  className="flex aspect-[5/4] items-center justify-center p-4 sm:p-5 lg:p-6"
                  style={{
                    background: item.isPlaceholder ? item.placeholderTone : "color-mix(in srgb, var(--muted) 30%, white)",
                  }}
                >
                  {item.isPlaceholder ? (
                    <div className="flex h-full w-full items-center justify-center border border-white/70 bg-white/20 text-center text-sm font-semibold text-slate-600">
                      임시 상품 슬롯
                    </div>
                  ) : (
                    <SafeImage src={item.image} alt={item.title} className="h-full w-full object-contain" seed={item.title} />
                  )}
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  <p className="line-clamp-2 min-h-[3rem] text-sm font-semibold text-[var(--ink)] sm:text-base">{item.title}</p>
                  <p className="text-xs text-slate-500 sm:text-sm">{item.subtitle}</p>
                  {item.originalPrice ? <p className="text-sm text-slate-400 line-through">{item.originalPrice}</p> : null}
                  {item.price ? <p className="text-base font-bold text-[var(--brand)] sm:text-lg">{item.price}</p> : null}
                </div>
              </>
            );

            if (item.isPlaceholder) {
              return (
                <div
                  key={`${item.id}-${index}`}
                  className={cardClassName}
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={`${item.id}-${index}`}
                href={item.href}
                className={cardClassName}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
        <style jsx>{`
          .home-product-marquee {
            animation-name: home-product-marquee;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }

          .home-product-marquee:hover {
            animation-play-state: paused;
          }

          @keyframes home-product-marquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }
        `}</style>
      </div>
    </section>
  );
}
