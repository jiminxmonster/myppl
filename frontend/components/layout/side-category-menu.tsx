"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Monitor,
  Shirt,
  UtensilsCrossed,
  Dumbbell,
  Home,
  Package,
} from "lucide-react";

import {
  AdminMenuCategory,
  getHotdealCategories,
  getMarketplaceCategories,
} from "@/lib/api";

type SideCategoryMenuProps = {
  title: string;
  description?: string;
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
  if (normalized.includes("가구") || normalized.includes("리빙")) {
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

export function SideCategoryMenu({
  title,
  basePath,
  categories,
  groupedCategories,
  selectedCategorySlug,
  refreshSource,
}: SideCategoryMenuProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [dynamicCategories, setDynamicCategories] = useState(categories);
  const [dynamicGroupedCategories, setDynamicGroupedCategories] = useState(groupedCategories ?? []);
  const selectedCategory = selectedCategorySlug ?? searchParams.get("category");
  const isBaseRoute = pathname === basePath;
  const hasGroups = dynamicGroupedCategories.length > 0;
  const flatCategories = useMemo(
    () => (hasGroups ? dynamicGroupedCategories.flatMap((group) => group.categories) : dynamicCategories),
    [dynamicCategories, dynamicGroupedCategories, hasGroups]
  );
  const desktopItems = useMemo(
    () => [
      {
        id: "all",
        name: "전체 보기",
        description: "",
        href: basePath,
        icon: Package,
        isActive: isBaseRoute && !selectedCategory,
      },
      ...flatCategories.map((category) => ({
        id: String(category.id),
        name: category.name,
        description: "",
        href: `${basePath}?category=${encodeURIComponent(category.slug)}`,
        icon: getCategoryIcon(category.name),
        isActive: selectedCategory === category.slug,
      })),
    ],
    [basePath, flatCategories, isBaseRoute, selectedCategory]
  );
  const collapsedRailStyle = useMemo(
    () => ({
      left: "max(0.75rem, calc((100vw - 80rem) / 2 + 14.5rem))",
    }),
    []
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
    const handleScroll = () => {
      setDesktopCollapsed(window.scrollY >= 2000);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const navContent = (
    <nav className="space-y-2 px-3 py-3 xl:px-3 xl:py-3">
      <Link
        href={basePath}
        className={`block rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${
          isBaseRoute && !selectedCategory ? "border-white bg-white/15" : "border-white/10 hover:bg-white/10"
        }`}
      >
        전체 보기
      </Link>
      {hasGroups
        ? dynamicGroupedCategories.map((group) => (
            <div key={group.id} className="space-y-2 pt-1">
              <p className="px-1 text-[22px] font-semibold text-white/90">{group.label}</p>
              {group.categories.map((category) => {
                const isActive = selectedCategory === category.slug;
                return (
                  <Link
                    key={`${group.id}-${category.id}`}
                    href={`${basePath}?category=${encodeURIComponent(category.slug)}`}
                    className={`block rounded-[5px] border px-4 py-3 text-sm font-medium transition ${
                      isActive ? "border-white bg-white/15" : "border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="block">{category.name}</span>
                  </Link>
                );
              })}
            </div>
          ))
        : dynamicCategories.map((category) => {
            const isActive = selectedCategory === category.slug;
            return (
              <Link
                key={category.id}
                href={`${basePath}?category=${encodeURIComponent(category.slug)}`}
                className={`block rounded-[5px] border px-4 py-3 text-sm font-medium transition ${
                  isActive ? "border-white bg-white/15" : "border-white/10 hover:bg-white/10"
                }`}
              >
                <span className="block">{category.name}</span>
              </Link>
            );
          })}
    </nav>
  );

  return (
    <>
      <div className="min-h-full w-[92px] xl:hidden">
        <aside
          className="sticky top-[104px] z-30 w-[92px] rounded-[5px] border border-[#0b8e3d] bg-[#0aa63f] text-white shadow-soft"
        >
          <div className="space-y-2 px-2 py-2">
            <div className="grid grid-cols-1 gap-2">
              <Link
                href={basePath}
                className={`flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-[5px] border px-2 py-3 text-center text-[10px] font-semibold ${
                  isBaseRoute && !selectedCategory
                    ? "border-white bg-white/15 text-white"
                    : "border-white/15 bg-white/5 text-white"
                }`}
              >
                <Package className="h-4 w-4" />
                <span className="line-clamp-2">전체 보기</span>
              </Link>
              {flatCategories.map((category) => {
                const isActive = selectedCategory === category.slug;
                const Icon = getCategoryIcon(category.name);
                return (
                  <Link
                    key={category.id}
                    href={`${basePath}?category=${encodeURIComponent(category.slug)}`}
                    className={`flex min-h-[70px] flex-col items-center justify-center gap-2 rounded-[5px] border px-2 py-3 text-center text-[10px] font-medium ${
                      isActive ? "border-white bg-white/15 text-white" : "border-white/15 bg-white/5 text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="line-clamp-2">{category.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
      {desktopCollapsed ? (
        <div className="hidden xl:block">
          <div className="fixed top-24 z-40" style={collapsedRailStyle}>
            <div className="w-[96px] rounded-[5px] border border-[#0b8e3d] bg-[#0aa63f] p-2 text-white shadow-soft">
              <div className="space-y-2">
                {desktopItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="group relative">
                      <Link
                        href={item.href}
                        className={`flex h-[72px] w-full flex-col items-center justify-center gap-1 rounded-[5px] border text-center text-[11px] font-semibold transition ${
                          item.isActive ? "border-white bg-white/15" : "border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="line-clamp-2 px-1">{item.name}</span>
                      </Link>
                      <div className="pointer-events-none absolute left-[106px] top-1/2 hidden w-60 -translate-y-1/2 rounded-[5px] border border-[var(--border)] bg-white p-4 text-slate-700 shadow-soft group-hover:block">
                        <p className="text-sm font-bold text-[var(--ink)]">{item.name}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden self-start xl:block">
          <aside className="sticky top-[104px] rounded-[5px] border border-[#0b8e3d] bg-[#0aa63f] text-white shadow-soft">
            <div className="border-b border-white/20 px-5 py-4">
              <h2 className="text-xl font-black">{title}</h2>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
