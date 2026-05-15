"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SafeImage } from "@/components/common/safe-image";
import {
  AdminMenuCategory,
  getHotdealCategories,
  getMarketplaceCategories,
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

function getCategoryPhotoSource(categoryName: string) {
  const normalized = normalizeCategoryKey(categoryName);

  if (normalized.includes("스포츠") || normalized.includes("레저") || normalized.includes("골프")) {
    return "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("식품") || normalized.includes("신선") || normalized.includes("건강")) {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("가공") || normalized.includes("간식") || normalized.includes("쿠폰")) {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("생활") || normalized.includes("주방") || normalized.includes("육아")) {
    return "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("패션") || normalized.includes("잡화") || normalized.includes("의류")) {
    return "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("뷰티")) {
    return "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("가전") || normalized.includes("디지털") || normalized.includes("노트북")) {
    return "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("가구") || normalized.includes("홈") || normalized.includes("리빙")) {
    return "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("취미") || normalized.includes("문구") || normalized.includes("펫")) {
    return "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=320&q=80";
  }
  if (normalized.includes("도서") || normalized.includes("음반")) {
    return "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=320&q=80";
  }

  return "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=320&q=80";
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
    <div className="relative bg-transparent">
      <button
        type="button"
        aria-label="이전 카테고리"
        onClick={() => scrollRail("left")}
        className="absolute left-0 top-10 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-600 shadow-soft transition hover:text-[var(--brand)] md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div
        ref={railRef}
        className="flex gap-5 overflow-x-auto px-1 pb-4 pt-1 [scrollbar-width:none] md:px-12 [&::-webkit-scrollbar]:hidden"
      >
        <Link href={basePath} className="group flex w-[128px] shrink-0 flex-col items-center gap-2 text-center">
          <span
            className={`flex h-[118px] w-[118px] items-center justify-center overflow-hidden rounded-[8px] border-2 bg-white transition ${
              isBaseRoute && !selectedCategory
                ? "border-[var(--brand)]"
                : "border-transparent group-hover:border-[var(--brand)]"
            }`}
          >
            <SafeImage
              src="/branding/promotion_001.png"
              alt="전체 카테고리"
              className="h-full w-full object-cover"
              seed="category-all"
            />
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

          return (
            <Link
              key={`${category.slug}-${category.id}`}
              href={`${basePath}?category=${encodeURIComponent(category.slug)}`}
              className="group flex w-[128px] shrink-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={`relative flex h-[118px] w-[118px] items-center justify-center overflow-hidden rounded-[8px] border-2 bg-white transition ${
                  isActive ? "border-[var(--brand)]" : "border-transparent group-hover:border-[var(--brand)]"
                }`}
              >
                <SafeImage
                  src={getCategoryPhotoSource(category.name)}
                  alt={`${category.name} 카테고리`}
                  className="h-full w-full object-cover"
                  seed={`category-${category.slug}-${category.name}`}
                />
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
        className="absolute right-0 top-10 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-600 shadow-soft transition hover:text-[var(--brand)] md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
