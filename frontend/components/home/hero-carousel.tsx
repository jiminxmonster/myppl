"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type HeroSlide = {
  id: string | number;
  title: string;
  description: string;
  href?: string;
  image: string;
  badge?: string;
  display_seconds?: number;
  transition_style?: "next" | "slide_lr" | "slide_ud" | "fade" | "mosaic" | "zoom" | "rotate" | "flip" | "wipe" | "cinema";
};

const heroThemes = [
  {
    eyebrow: "SELLER PROMOTION",
    kicker: "나만의 광고 구좌",
    metric: "AD COST DOWN",
    cta: "상품 홍보 시작",
    accent: "from-amber-300 via-orange-400 to-rose-400",
    glow: "bg-amber-300/35",
    card: "bg-orange-50 text-orange-950",
  },
  {
    eyebrow: "PERFORMANCE ADS",
    kicker: "효율 중심 노출",
    metric: "HIGH ROAS",
    cta: "성과 확인하기",
    accent: "from-emerald-300 via-teal-300 to-lime-300",
    glow: "bg-emerald-300/35",
    card: "bg-emerald-50 text-emerald-950",
  },
  {
    eyebrow: "COMMUNITY PICK",
    kicker: "함께 찾는 좋은 상품",
    metric: "REAL PICKS",
    cta: "핫이슈 보기",
    accent: "from-sky-300 via-cyan-300 to-orange-300",
    glow: "bg-cyan-300/35",
    card: "bg-cyan-50 text-cyan-950",
  },
];

function formatHeroTitle(title: string) {
  const trimmedTitle = title.trim();
  const formattedTitles: Record<string, string> = {
    "비싼광고 No, 나만의 상품을 싸게 홍보한다.": "비싼광고 No,\n나만의 상품을\n싸게 홍보한다.",
    "가격대비, 최고의 효율 광고": "가격대비,\n최고의 효율 광고",
    "소비자끼리 서로 공유하고, 좋은 상품 발견하자": "소비자끼리 서로 공유하고,\n좋은 상품 발견하자",
  };

  return formattedTitles[trimmedTitle] ?? trimmedTitle;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [transitionFromIndex, setTransitionFromIndex] = useState<number | null>(null);
  const incomingRef = useRef<HTMLDivElement | null>(null);
  const outgoingRef = useRef<HTMLDivElement | null>(null);
  const orderedSlides = useMemo(() => [...slides], [slides]);

  useEffect(() => {
    if (index >= orderedSlides.length) {
      setIndex(0);
    }
  }, [index, orderedSlides.length]);

  if (orderedSlides.length === 0) {
    return null;
  }

  const active = orderedSlides[index];
  const transitionStyle = active.transition_style ?? "next";
  const outgoing = transitionFromIndex === null ? null : orderedSlides[transitionFromIndex];
  const theme = heroThemes[index % heroThemes.length];

  function moveToSlide(nextIndex: number) {
    if (nextIndex === index || transitionFromIndex !== null) {
      return;
    }
    setTransitionFromIndex(index);
    setIndex(nextIndex);
  }

  useEffect(() => {
    if (orderedSlides.length <= 1 || transitionFromIndex !== null) {
      return;
    }

    const currentSlide = orderedSlides[index] ?? orderedSlides[0];
    const intervalMs = Math.max(1_000, (currentSlide?.display_seconds ?? 3) * 1_000);
    const timer = window.setTimeout(() => {
      moveToSlide((index + 1) % orderedSlides.length);
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [orderedSlides, index, transitionFromIndex]);

  useEffect(() => {
    if (transitionFromIndex === null) {
      return;
    }

    const incomingElement = incomingRef.current;
    const outgoingElement = outgoingRef.current;
    if (!incomingElement || !outgoingElement) {
      setTransitionFromIndex(null);
      return;
    }

    const inFramesByStyle: Record<NonNullable<HeroSlide["transition_style"]>, Keyframe[]> = {
      next: [{ opacity: 0 }, { opacity: 1 }],
      slide_lr: [{ transform: "translateX(100%)", opacity: 1 }, { transform: "translateX(0%)", opacity: 1 }],
      slide_ud: [{ transform: "translateY(100%)", opacity: 1 }, { transform: "translateY(0%)", opacity: 1 }],
      fade: [{ filter: "blur(5px)", opacity: 0 }, { filter: "blur(0px)", opacity: 1 }],
      mosaic: [{ clipPath: "inset(45% 45% 45% 45%)", opacity: 0 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }],
      zoom: [{ transform: "scale(1.14)", opacity: 0.2 }, { transform: "scale(1)", opacity: 1 }],
      rotate: [{ transform: "rotate(-4deg) scale(1.05)", opacity: 0.2 }, { transform: "rotate(0deg) scale(1)", opacity: 1 }],
      flip: [
        { transform: "rotateY(90deg)", opacity: 0, offset: 0 },
        { transform: "rotateY(90deg)", opacity: 0, offset: 0.48 },
        { transform: "rotateY(0deg)", opacity: 1, offset: 1 },
      ],
      wipe: [{ clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }],
      cinema: [{ transform: "translateX(24%) scale(1.08)", opacity: 0.15 }, { transform: "translateX(0%) scale(1)", opacity: 1 }],
    };

    const outFramesByStyle: Record<NonNullable<HeroSlide["transition_style"]>, Keyframe[]> = {
      next: [{ opacity: 1 }, { opacity: 0 }],
      slide_lr: [{ transform: "translateX(0%)", opacity: 1 }, { transform: "translateX(-100%)", opacity: 1 }],
      slide_ud: [{ transform: "translateY(0%)", opacity: 1 }, { transform: "translateY(-100%)", opacity: 1 }],
      fade: [{ filter: "blur(0px)", opacity: 1 }, { filter: "blur(4px)", opacity: 0 }],
      mosaic: [{ clipPath: "inset(0 0 0 0)", opacity: 1 }, { clipPath: "inset(40% 40% 40% 40%)", opacity: 0 }],
      zoom: [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.92)", opacity: 0 }],
      rotate: [{ transform: "rotate(0deg) scale(1)", opacity: 1 }, { transform: "rotate(4deg) scale(0.96)", opacity: 0 }],
      flip: [
        { transform: "rotateY(0deg)", opacity: 1, offset: 0 },
        { transform: "rotateY(-90deg)", opacity: 0, offset: 0.52 },
        { transform: "rotateY(-90deg)", opacity: 0, offset: 1 },
      ],
      wipe: [{ clipPath: "inset(0 0 0 0)", opacity: 1 }, { clipPath: "inset(0 0 0 100%)", opacity: 1 }],
      cinema: [{ transform: "translateX(0%) scale(1)", opacity: 1 }, { transform: "translateX(-24%) scale(1.08)", opacity: 0.1 }],
    };

    const durationByStyle: Record<NonNullable<HeroSlide["transition_style"]>, number> = {
      next: 700,
      slide_lr: 800,
      slide_ud: 800,
      fade: 850,
      mosaic: 900,
      zoom: 950,
      rotate: 950,
      flip: 900,
      wipe: 850,
      cinema: 1050,
    };

    const duration = durationByStyle[transitionStyle];
    const incomingAnimation = incomingElement.animate(inFramesByStyle[transitionStyle], {
      duration,
      easing: "ease",
      fill: "both",
    });
    const outgoingAnimation = outgoingElement.animate(outFramesByStyle[transitionStyle], {
      duration,
      easing: "ease",
      fill: "both",
    });

    const doneTimer = window.setTimeout(() => setTransitionFromIndex(null), duration);
    return () => {
      window.clearTimeout(doneTimer);
      incomingAnimation.cancel();
      outgoingAnimation.cancel();
    };
  }, [transitionFromIndex, transitionStyle]);

  const content = (
    <div
      ref={incomingRef}
      className="hero-slide relative z-[2] min-h-[430px] overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-9 lg:min-h-[470px] lg:px-14"
      style={{
        backgroundImage: `url(${active.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,20,28,0.82)_0%,rgba(5,20,28,0.54)_46%,rgba(5,20,28,0.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-[linear-gradient(0deg,rgba(5,20,28,0.56)_0%,rgba(5,20,28,0)_100%)]" />
      <div className={`absolute -right-20 top-8 h-72 w-72 rounded-full ${theme.glow} blur-3xl`} />
      <div className="absolute left-8 top-8 h-32 w-32 rounded-full border border-white/20" />
      <div className="absolute left-20 top-20 h-3 w-3 rounded-full bg-white/70" />

      <div className="relative z-10 grid min-h-[380px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${theme.accent}`} />
            {theme.eyebrow}
          </div>
          <p className="mt-7 text-sm font-black tracking-[0.3em] text-white/70">{theme.kicker}</p>
          <h1 className="mt-3 max-w-[760px] whitespace-pre-line break-keep text-[2.75rem] font-black leading-[1.02] tracking-[-0.055em] text-white [text-shadow:0_18px_42px_rgba(0,0,0,0.36)] sm:text-[4rem] lg:text-[4.85rem]">
            {formatHeroTitle(active.title)}
          </h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/88 [text-shadow:0_8px_28px_rgba(0,0,0,0.28)] sm:text-xl">
            {active.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-[5px] bg-white px-5 py-3 text-sm font-black text-[var(--brand)] shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
              {theme.cta}
            </span>
            <span className="rounded-[5px] border border-white/25 bg-white/12 px-5 py-3 text-sm font-bold text-white backdrop-blur-md">
              {theme.metric}
            </span>
          </div>
        </div>

        <div className="relative hidden min-h-[370px] lg:block">
          <div className="absolute inset-y-8 right-0 z-0 w-[360px] rounded-[2rem] border border-white/25 bg-white/12 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl" />
          <div className="absolute right-14 top-10 z-10 h-24 w-24 rounded-full bg-white/95 shadow-[0_22px_50px_rgba(0,0,0,0.2)]" />
          <div className={`absolute right-8 top-28 z-10 h-56 w-36 rounded-t-[4rem] bg-gradient-to-b ${theme.accent} shadow-[0_24px_55px_rgba(0,0,0,0.22)]`} />
          <div className="absolute right-2 top-48 z-10 h-20 w-32 rotate-[-18deg] rounded-full border-[16px] border-white/80 border-l-transparent border-b-transparent" />
          <div className="absolute right-52 top-28 z-20 w-48 rounded-[1.25rem] border border-white/30 bg-white/92 p-4 text-slate-950 shadow-[0_22px_60px_rgba(0,0,0,0.22)]">
            <div className={`h-24 rounded-[1rem] bg-gradient-to-br ${theme.accent}`} />
            <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Featured</p>
            <p className="mt-1 text-lg font-black leading-tight">MYPPL AD</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-black text-[var(--brand)]">효율노출</span>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">HOT</span>
            </div>
          </div>
          <div className={`absolute bottom-8 right-36 z-30 rounded-[1.25rem] border border-white/35 ${theme.card} px-5 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.26)]`}>
            <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">Reach</p>
            <p className="mt-1 text-3xl font-black">+248%</p>
          </div>
        </div>
      </div>
    </div>
  );

  const wrapperClassName =
    "relative block overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft";
  const baseBackgroundSlide = transitionStyle === "flip" && outgoing ? outgoing : active;
  const wrapperStyle = {
    backgroundImage: `url(${baseBackgroundSlide.image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    perspective: "1400px",
  } as const;

  return (
    <>
      {active.href ? (
        <Link href={active.href} className={wrapperClassName} style={wrapperStyle}>
          {outgoing ? (
            <div
              ref={outgoingRef}
              className="absolute inset-0 z-[1]"
              style={{
                backgroundImage: `url(${outgoing.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          ) : null}
          {content}
        </Link>
      ) : (
        <section className={wrapperClassName} style={wrapperStyle}>
          {outgoing ? (
            <div
              ref={outgoingRef}
              className="absolute inset-0 z-[1]"
              style={{
                backgroundImage: `url(${outgoing.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />
          ) : null}
          {content}
        </section>
      )}
      {orderedSlides.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {orderedSlides.map((slide, slideIndex) => (
            <button
              key={`dot-${slide.id}`}
              type="button"
              onClick={() => moveToSlide(slideIndex)}
              aria-label={`${slideIndex + 1}번 광고로 이동`}
              className={`h-3 w-3 rounded-full transition ${
                slideIndex === index ? "bg-[var(--brand)] ring-2 ring-[var(--brand)]/25" : "bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
