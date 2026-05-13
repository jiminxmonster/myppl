"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Home,
  Monitor,
  Package,
  Shirt,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";

import { SafeImage } from "@/components/common/safe-image";
import {
  AdminMenuCategory,
  getHotdealCategories,
  getMarketplaceCategories,
  getProductPlaceholder,
} from "@/lib/api";

type TopCategoryIconMenuProps = {
  basePath: string;
  categories: AdminMenuCategory[];
  groupedCategories?: Array<{
    id: string;
    label: string;
    categories: AdminMenuCategory[];
  }>;
  selectedCategorySlug?: string | null;
  refreshSource?: "hotdeal" | "marketplace" | "products";
};

function normalizeCategoryKey(value: string) {
  return value.replace(/[\/\s_-]+/g, "").trim().toLowerCase();
}

function getCategoryIcon(name: string) {
  const normalized = normalizeCategoryKey(name);
  if (normalized.includes("가전") || normalized.includes("디지털") || normalized.includes("노트북")) {
    return Monitor;
  }
  if (normalized.includes("패션") || normalized.includes("잡화") || normalized.includes("의류")) {
    return Shirt;
  }
  if (normalized.includes("식품") || normalized.includes("주방") || normalized.includes("생활")) {
    return UtensilsCrossed;
  }
  if (normalized.includes("스포츠") || normalized.includes("레저") || normalized.includes("골프")) {
    return Dumbbell;
  }
  if (normalized.includes("가구") || normalized.includes("리빙") || normalized.includes("홈")) {
    return Home;
  }
  return Package;
}

function dedupeCategories(items: AdminMenuCategory[]) {
  const categoryMap = new Map<string, AdminMenuCategory>();

  items.forEach((item) => {
    const key = normalizeCategoryKey(item.name);
    const existing = categoryMap.get(key);
    if (!existing) {
      categoryMap.set(key, item);
      return;
    }

    categoryMap.set(key, {
      ...existing,
      description: existing.description || item.description,
      sort_order: Math.min(existing.sort_order ?? 0, item.sort_order ?? 0),
      is_visible: existing.is_visible || item.is_visible,
    });
  });

  return Array.from(categoryMap.values()).sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.id - right.id
  );
}

function getCategoryImageSource(category: AdminMenuCategory, refreshSource?: TopCategoryIconMenuProps["refreshSource"]) {
  const source = category.slug.startsWith("marketplace:")
    ? "marketplace"
    : category.slug.startsWith("hotdeal:")
      ? "hotdeal"
      : refreshSource === "marketplace"
        ? "marketplace"
        : "hotdeal";

  return getProductPlaceholder(source, category.name);
}

export function TopCategoryIconMenu({
  basePath,
  categories,
  groupedCategories,
  selectedCategorySlug,
  refreshSource,
}: TopCategoryIconMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState(categories);
  const [dynamicGroupedCategories, setDynamicGroupedCategories] = useState(groupedCategories ?? []);
  const selectedCategory = selectedCategorySlug ?? searchParams.get("category");
  const isBaseRoute = pathname === basePath;
  const hasGroups = dynamicGroupedCategories.length > 0;

  const flatCategories = useMemo(
    () => (hasGroups ? dynamicGroupedCategories.flatMap((group) => group.categories) : dynamicCategories),
    [dynamicCategories, dynamicGroupedCategories, hasGroups]
  );

  useEffect(() => {
    setDynamicCategories(dedupeCategories(categories));
    setDynamicGroupedCategories(
      groupedCategories
        ? groupedCategories.map((group) => ({
            ...group,
            categories: dedupeCategories(group.categories),
          }))
        : []
    );
  }, [categories, groupedCategories]);

  useEffect(() => {
    if (!refreshSource) {
      return;
    }

    let mounted = true;
    const loadCategories = async () => {
      try {
        if (!mounted) {
          return;
        }
        if (refreshSource === "products") {
          const hotdealItems = (await getHotdealCategories()).map((item) => ({
            ...item,
            slug: `hotdeal:${item.slug}`,
          }));
          const marketplaceItems = (await getMarketplaceCategories()).map((item) => ({
            ...item,
            slug: `marketplace:${item.slug}`,
          }));
          setDynamicGroupedCategories([
            { id: "sale", label: "판매상품", categories: dedupeCategories(hotdealItems) },
            { id: "used", label: "중고상품", categories: dedupeCategories(marketplaceItems) },
          ]);
          setDynamicCategories(dedupeCategories([...hotdealItems, ...marketplaceItems]));
          return;
        }
        const items = refreshSource === "hotdeal" ? await getHotdealCategories() : await getMarketplaceCategories();
        setDynamicCategories(dedupeCategories(items));
      } catch {
        if (mounted) {
          setDynamicCategories(dedupeCategories(categories));
          setDynamicGroupedCategories(
            groupedCategories
              ? groupedCategories.map((group) => ({
                  ...group,
                  categories: dedupeCategories(group.categories),
                }))
              : []
          );
        }
      }
    };

    void loadCategories();

    const eventName =
      refreshSource === "hotdeal"
        ? "hotdeal:categories-updated"
        : refreshSource === "marketplace"
          ? "marketplace:categories-updated"
          : null;
    const storageKey =
      refreshSource === "hotdeal"
        ? "hotdeal:categories-updated"
        : refreshSource === "marketplace"
          ? "marketplace:categories-updated"
          : null;
    const handleCustomRefresh = () => {
      void loadCategories();
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "hotdeal:categories-updated" ||
        event.key === "marketplace:categories-updated" ||
        (storageKey && event.key === storageKey)
      ) {
        void loadCategories();
      }
    };
    const handleFocus = () => {
      void loadCategories();
    };

    if (eventName) {
      window.addEventListener(eventName, handleCustomRefresh);
    }
    if (refreshSource === "products") {
      window.addEventListener("hotdeal:categories-updated", handleCustomRefresh);
      window.addEventListener("marketplace:categories-updated", handleCustomRefresh);
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      if (eventName) {
        window.removeEventListener(eventName, handleCustomRefresh);
      }
      if (refreshSource === "products") {
        window.removeEventListener("hotdeal:categories-updated", handleCustomRefresh);
        window.removeEventListener("marketplace:categories-updated", handleCustomRefresh);
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [categories, groupedCategories, refreshSource]);

  const scrollRail = (direction: "left" | "right") => {
    railRef.current?.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative border-b border-[var(--border)] bg-white">
      <button
        type="button"
        aria-label="이전 카테고리"
        onClick={() => scrollRail("left")}
        className="absolute left-0 top-9 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-600 shadow-soft transition hover:text-[var(--brand)] md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={railRef}
        className="flex gap-5 overflow-x-auto px-1 pb-5 pt-1 [scrollbar-width:none] md:px-12 [&::-webkit-scrollbar]:hidden"
      >
        <Link href={basePath} className="group flex w-[86px] shrink-0 flex-col items-center gap-2 text-center">
          <span
            className={`flex h-[74px] w-[74px] items-center justify-center rounded-full border-2 transition ${
              isBaseRoute && !selectedCategory
                ? "border-[var(--brand)] bg-[#edf8ef] text-[var(--brand)]"
                : "border-slate-100 bg-slate-50 text-slate-500 group-hover:border-[var(--brand)] group-hover:text-[var(--brand)]"
            }`}
          >
            <Trophy className="h-8 w-8" />
          </span>
          <span
            className={`line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 ${
              isBaseRoute && !selectedCategory ? "text-[var(--brand)]" : "text-slate-600 group-hover:text-[var(--brand)]"
            }`}
          >
            전체
          </span>
        </Link>
        {flatCategories.map((category) => {
          const isActive = selectedCategory === category.slug;
          const Icon = getCategoryIcon(category.name);

          return (
            <Link
              key={`${category.slug}-${category.id}`}
              href={`${basePath}?category=${encodeURIComponent(category.slug)}`}
              className="group flex w-[86px] shrink-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={`relative flex h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-full border-2 bg-slate-50 transition ${
                  isActive ? "border-[var(--brand)]" : "border-transparent group-hover:border-[var(--brand)]"
                }`}
              >
                <SafeImage
                  src={getCategoryImageSource(category, refreshSource)}
                  alt={`${category.name} 카테고리`}
                  className="h-full w-full object-cover opacity-80"
                  seed={`category-${category.slug}-${category.name}`}
                />
                <span className="absolute inset-0 bg-white/30" />
                <Icon className="absolute h-7 w-7 text-slate-700 drop-shadow-sm group-hover:text-[var(--brand)]" />
              </span>
              <span
                className={`line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 ${
                  isActive ? "text-[var(--brand)]" : "text-slate-600 group-hover:text-[var(--brand)]"
                }`}
              >
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="다음 카테고리"
        onClick={() => scrollRail("right")}
        className="absolute right-0 top-9 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-600 shadow-soft transition hover:text-[var(--brand)] md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
