"use client";

import { useMemo, useState } from "react";

type SafeImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  seed?: string;
};

function buildSeedFallback(seed: string) {
  const normalized = encodeURIComponent(seed || "myppl");
  return `https://picsum.photos/seed/${normalized}/960/640`;
}

export function SafeImage({ src, alt, className, fallbackSrc, seed }: SafeImageProps) {
  const defaultFallback = useMemo(() => buildSeedFallback(seed || alt), [seed, alt]);
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc || defaultFallback);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (currentSrc !== (fallbackSrc || defaultFallback)) {
          setCurrentSrc(fallbackSrc || defaultFallback);
        }
      }}
    />
  );
}

