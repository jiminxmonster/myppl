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
      className="hero-slide relative z-[2] h-full overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-9 lg:px-14"
      style={{
        backgroundImage: `url(${active.image})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0b3de5",
        backfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
      }}
    />
  );

  const wrapperClassName =
    "relative block h-[430px] overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft lg:h-[470px]";
  const baseBackgroundSlide = transitionStyle === "flip" && outgoing ? outgoing : active;
  const wrapperStyle = {
    backgroundImage: `url(${baseBackgroundSlide.image})`,
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#0b3de5",
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
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#0b3de5",
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
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#0b3de5",
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
