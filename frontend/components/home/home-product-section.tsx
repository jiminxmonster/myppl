"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SafeImage } from "@/components/common/safe-image";

type HomeProductCard = {
  id: number;
  title: string;
  subtitle: string;
  image?: string;
  href: string;
  price?: string;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const minimumDeckCount = 12;

  useEffect(() => {
    function syncVisibleCount() {
      if (window.innerWidth < 640) {
        setVisibleCount(1);
        return;
      }
      if (window.innerWidth < 1024) {
        setVisibleCount(2);
        return;
      }
      setVisibleCount(4);
    }

    syncVisibleCount();
    window.addEventListener("resize", syncVisibleCount);
    return () => window.removeEventListener("resize", syncVisibleCount);
  }, []);

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

  const deck = useMemo(() => {
    if (paddedItems.length <= visibleCount) {
      return paddedItems;
    }

    return [...paddedItems, ...paddedItems.slice(0, visibleCount)];
  }, [paddedItems, visibleCount]);

  useEffect(() => {
    if (paddedItems.length <= visibleCount) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % paddedItems.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [paddedItems.length, visibleCount]);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleCount, title]);

  if (items.length === 0) {
    return null;
  }

  function handlePrev() {
    setActiveIndex((current) => {
      if (paddedItems.length <= visibleCount) {
        return 0;
      }
      return (current - 1 + paddedItems.length) % paddedItems.length;
    });
  }

  function handleNext() {
    setActiveIndex((current) => {
      if (paddedItems.length <= visibleCount) {
        return 0;
      }
      return (current + 1) % paddedItems.length;
    });
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
        <button
          type="button"
          className="absolute left-1 top-[38%] z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[5px] border border-[var(--border)] bg-white/95 text-[var(--ink)] shadow-soft transition hover:bg-white sm:left-2"
          onClick={handlePrev}
          aria-label={`${title} 이전 상품 보기`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="absolute right-1 top-[38%] z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[5px] border border-[var(--border)] bg-white/95 text-[var(--ink)] shadow-soft transition hover:bg-white sm:right-2"
          onClick={handleNext}
          aria-label={`${title} 다음 상품 보기`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div
          className="flex gap-4 transition-transform duration-700 ease-out"
          style={{
            width: `${(deck.length * 100) / visibleCount}%`,
            transform: `translateX(-${(activeIndex * 100) / deck.length}%)`,
          }}
        >
          {deck.map((item, index) => {
            const cardClassName =
              "block overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-1";

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
                  {item.price ? <p className="text-base font-bold text-[var(--brand)] sm:text-lg">{item.price}</p> : null}
                </div>
              </>
            );

            if (item.isPlaceholder) {
              return (
                <div
                  key={`${item.id}-${index}`}
                  className={cardClassName}
                  style={{ width: `${100 / deck.length}%` }}
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
                style={{ width: `${100 / deck.length}%` }}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
