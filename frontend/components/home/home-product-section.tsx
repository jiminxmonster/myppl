"use client";

import Link from "next/link";
import { useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import { Crown } from "lucide-react";

import { SafeImage } from "@/components/common/safe-image";

type HomeProductCard = {
  id: number;
  title: string;
  subtitle: string;
  image?: string;
  href: string;
  isExternal?: boolean;
  actionLabel?: string;
  liveStatusLabel?: string;
  liveStatus?: string;
  liveBenefit?: string;
  price?: string;
  originalPrice?: string;
};

type DisplayCard = HomeProductCard & {
  isPlaceholder?: boolean;
  placeholderTone?: string;
  rank?: number;
};

const PLACEHOLDER_TONES = [
  "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
  "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
  "linear-gradient(135deg, #fae8ff 0%, #e9d5ff 100%)",
  "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
  "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
];

function getRankBarClassName(rank: number) {
  if (rank === 1) {
    return "bg-[#f7d35f] text-[#4c3508]";
  }
  if (rank === 2) {
    return "bg-[#d8dde6] text-[#334155]";
  }
  if (rank === 3) {
    return "bg-[#c9854f] text-white";
  }
  if (rank >= 4 && rank <= 10) {
    return "bg-orange-500 text-white";
  }
  if (rank >= 11 && rank <= 20) {
    return "bg-emerald-600 text-white";
  }
  if (rank >= 21 && rank <= 30) {
    return "bg-sky-600 text-white";
  }
  return "";
}

function getRankIconClassName(rank: number) {
  if (rank === 1) {
    return "text-[#8a5a00]";
  }
  if (rank === 2) {
    return "text-[#64748b]";
  }
  if (rank === 3) {
    return "text-[#7c3f18]";
  }
  return "";
}

function RankTopBar({ rank }: { rank: number }) {
  const barClassName = getRankBarClassName(rank);

  if (!barClassName) {
    return null;
  }

  const isPodium = rank <= 3;
  const iconClassName = getRankIconClassName(rank);

  return (
    <div className={`flex h-10 items-center px-4 text-sm font-black ${barClassName}`}>
      <span className="inline-flex items-center gap-1.5">
        {isPodium ? <Crown className={`h-5 w-5 ${iconClassName}`} fill="currentColor" /> : null}
        <span className="text-[1.6em] leading-none">{rank}</span>
      </span>
    </div>
  );
}

export function HomeProductSection({
  title,
  description,
  items,
  viewAllHref,
  showWhenEmpty = false,
}: {
  title: string;
  description: string;
  items: HomeProductCard[];
  viewAllHref?: string;
  showWhenEmpty?: boolean;
}) {
  const minimumDeckCount = 12;
  const dragStateRef = useRef({
    pointerId: -1,
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    hasMoved: false,
  });
  const suppressClickRef = useRef(false);

  const paddedItems = useMemo<DisplayCard[]>(() => {
    const rankedItems = items.map((item, index) => ({ ...item, rank: index + 1 }));

    if (rankedItems.length >= minimumDeckCount) {
      return rankedItems;
    }

    const placeholders = Array.from({ length: minimumDeckCount - rankedItems.length }, (_, index) => ({
      id: 100000 + index,
      title: `추천 상품 슬롯 ${String(index + 1).padStart(2, "0")}`,
      subtitle: "추가 상품이 여기에 자동으로 채워집니다",
      href: "#",
      price: "업데이트 대기",
      isPlaceholder: true,
      placeholderTone: PLACEHOLDER_TONES[index % PLACEHOLDER_TONES.length],
    }));

    return [...rankedItems, ...placeholders];
  }, [items]);

  if (items.length === 0 && !showWhenEmpty) {
    return null;
  }

  function getCardElements(container: HTMLDivElement) {
    return Array.from(container.querySelectorAll<HTMLElement>("[data-home-product-card]"));
  }

  function getClosestCardIndex(cards: HTMLElement[], scrollLeft: number) {
    return cards.reduce(
      (closest, card, index) => {
        const distance = Math.abs(card.offsetLeft - scrollLeft);
        return distance < closest.distance ? { index, distance } : closest;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY }
    ).index;
  }

  function getVisibleCardCount(container: HTMLDivElement, cards: HTMLElement[]) {
    if (cards.length < 2) {
      return 1;
    }

    const cardStep = Math.max(cards[1].offsetLeft - cards[0].offsetLeft, cards[0].offsetWidth, 1);
    return Math.min(cards.length, Math.max(1, Math.round(container.clientWidth / cardStep)));
  }

  function handleDragStart(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      hasMoved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic pointer events do not have an active pointer capture target.
    }
  }

  function handleDragMove(event: PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state.isDragging || state.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - state.startX;
    if (Math.abs(deltaX) > 6) {
      state.hasMoved = true;
      event.preventDefault();
    }
    event.currentTarget.scrollLeft = state.startScrollLeft - deltaX;
  }

  function handleDragEnd(event: PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state.isDragging || state.pointerId !== event.pointerId) {
      return;
    }

    const container = event.currentTarget;
    const pageWidth = Math.max(container.clientWidth, 1);
    const deltaX = event.clientX - state.startX;
    const threshold = Math.max(48, pageWidth * 0.12);
    const cards = getCardElements(container);
    const visibleCardCount = getVisibleCardCount(container, cards);
    const startIndex = getClosestCardIndex(cards, state.startScrollLeft);
    let nextIndex = getClosestCardIndex(cards, container.scrollLeft);

    if (deltaX <= -threshold) {
      nextIndex = startIndex + visibleCardCount;
    } else if (deltaX >= threshold) {
      nextIndex = startIndex - visibleCardCount;
    }

    const maxStartIndex = Math.max(0, cards.length - visibleCardCount);
    const targetIndex = Math.min(Math.max(nextIndex, 0), maxStartIndex);
    const targetLeft = cards[targetIndex]?.offsetLeft ?? 0;

    container.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });

    try {
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore capture cleanup failures from non-native pointer event paths.
    }
    if (state.hasMoved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 120);
    }

    dragStateRef.current = {
      pointerId: -1,
      isDragging: false,
      startX: 0,
      startScrollLeft: 0,
      hasMoved: false,
    };
  }

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <section className="space-y-4 overflow-hidden">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--ink)]">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="shrink-0 rounded-[5px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
          >
            전체보기
          </Link>
        ) : null}
      </div>
      <div className="relative overflow-hidden">
        <div
          className="home-product-scroller flex gap-4 overflow-x-auto scroll-smooth pb-2"
          style={{ touchAction: "pan-y" }}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onClickCapture={handleCardClick}
          onDragStart={(event) => event.preventDefault()}
        >
          {paddedItems.map((item, index) => {
            const isOnAir = item.liveStatus === "on_air" || item.liveStatusLabel === "진행중";
            const cardClassName =
              "block w-[220px] shrink-0 select-none overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-1 sm:w-[250px] lg:w-[270px]";

            const cardContent = (
              <>
                {item.rank ? <RankTopBar rank={item.rank} /> : null}
                <div
                  className="flex aspect-[5/4] items-center justify-center overflow-hidden"
                  style={{
                    background: item.isPlaceholder ? item.placeholderTone : "color-mix(in srgb, var(--muted) 30%, white)",
                  }}
                >
                  {item.isPlaceholder ? (
                    <div className="flex h-full w-full items-center justify-center border border-white/70 bg-white/20 text-center text-sm font-semibold text-slate-600">
                      임시 상품 슬롯
                    </div>
                  ) : (
                    <SafeImage src={item.image} alt={item.title} className="h-full w-full object-cover" seed={item.title} />
                  )}
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  {item.liveStatusLabel ? (
                    <p
                      className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] font-black text-white ${
                        isOnAir ? "home-live-onair-badge bg-red-600" : "bg-[var(--accent)]"
                      }`}
                    >
                      {isOnAir ? (
                        <>
                          <span className="home-live-onair-dot h-1.5 w-1.5 rounded-full bg-white" />
                          <span className="tracking-[0.08em]">ON AIR</span>
                        </>
                      ) : null}
                      <span>{item.liveStatusLabel}</span>
                    </p>
                  ) : null}
                  <p className="line-clamp-2 min-h-[3rem] text-sm font-semibold text-[var(--ink)] sm:text-base">{item.title}</p>
                  <p className="text-xs text-slate-500 sm:text-sm">{item.subtitle}</p>
                  {item.originalPrice ? <p className="text-[0.9625rem] leading-5 text-slate-400 line-through">{item.originalPrice}</p> : null}
                  {item.price ? <p className="text-[1.1rem] font-bold text-[var(--brand)] sm:text-[1.2375rem]">{item.price}</p> : null}
                  {item.liveBenefit ? <p className="line-clamp-1 text-xs font-semibold text-[var(--brand)]">{item.liveBenefit}</p> : null}
                  {item.actionLabel ? (
                    <p className="inline-flex rounded-[5px] bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white">
                      {item.actionLabel}
                    </p>
                  ) : null}
                </div>
              </>
            );

            if (item.isPlaceholder) {
              return (
                <div
                  key={`${item.id}-${index}`}
                  data-home-product-card
                  className={cardClassName}
                >
                  {cardContent}
                </div>
              );
            }

            if (item.isExternal) {
              return (
                <a
                  key={`${item.id}-${index}`}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  draggable={false}
                  data-home-product-card
                  className={cardClassName}
                >
                  {cardContent}
                </a>
              );
            }

            return (
              <Link
                key={`${item.id}-${index}`}
                href={item.href}
                draggable={false}
                data-home-product-card
                className={cardClassName}
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
        <style jsx>{`
          .home-product-scroller {
            cursor: grab;
            scrollbar-width: none;
          }

          .home-product-scroller:active {
            cursor: grabbing;
          }

          .home-product-scroller::-webkit-scrollbar {
            display: none;
          }

          .home-live-onair-badge {
            animation: home-live-onair-glow 1.1s ease-in-out infinite;
          }

          .home-live-onair-dot {
            animation: home-live-onair-blink 0.75s steps(2, start) infinite;
          }

          @keyframes home-live-onair-glow {
            0%,
            100% {
              box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
            }
            50% {
              box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.14);
            }
          }

          @keyframes home-live-onair-blink {
            0%,
            49% {
              opacity: 1;
            }
            50%,
            100% {
              opacity: 0.25;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
