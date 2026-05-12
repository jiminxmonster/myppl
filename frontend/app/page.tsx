import Link from "next/link";

import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { HomeProductSection } from "@/components/home/home-product-section";
import {
  getBoards,
  getHomeHeroSlides,
  getHomeProductSections,
  getBoardPosts,
  getHotdeals,
  getMarketplaceItems,
  getProductPlaceholder,
  resolveMediaUrl,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [boards, heroSlides, homeSections, hotdeals, marketplaceItems] = await Promise.all([
    getBoards().catch(() => []),
    getHomeHeroSlides().catch(() => []),
    getHomeProductSections().catch(() => []),
    getHotdeals().catch(() => []),
    getMarketplaceItems().catch(() => []),
  ]);

  const buyerBoard = boards.find((board) => board.show_in_top_menu && board.audience === "buyer");
  const sellerBoard = boards.find((board) => board.show_in_top_menu && board.audience === "seller");

  const [buyerPosts, sellerPosts] = await Promise.all([
    buyerBoard ? getBoardPosts(buyerBoard.slug).catch(() => []) : Promise.resolve([]),
    sellerBoard ? getBoardPosts(sellerBoard.slug).catch(() => []) : Promise.resolve([]),
  ]);

  const heroFallbackImages = [
    "/branding/promotion_001.png",
    "/branding/hero_seed_02.svg",
    "/branding/hero_seed_03.svg",
    "/branding/hero_seed_04.svg",
  ];

  const configuredHeroSlides = heroSlides
    .filter((slide) => slide.is_active)
    .map((slide, index) => {
      const resolvedImage = resolveMediaUrl(slide.image);
      return {
        ...slide,
        href: slide.href || undefined,
        image: resolvedImage || heroFallbackImages[index % heroFallbackImages.length],
        badge: slide.badge || "광고",
        display_seconds: slide.display_seconds || 3,
        transition_style: (slide.transition_style || "next") as
          | "next"
          | "slide_lr"
          | "slide_ud"
          | "fade"
          | "mosaic"
          | "zoom"
          | "rotate"
          | "flip"
          | "wipe"
          | "cinema",
      };
    });

  const fallbackHeroSlides = [
    {
      id: "hero-fallback-1",
      title: "myPPL 메인 프로모션",
      description: "실시간 인기 상품과 신규 등록 소식을 바로 확인하세요.",
      image: heroFallbackImages[0],
      badge: "광고",
      display_seconds: 4,
      transition_style: "next",
    },
    {
      id: "hero-fallback-2",
      title: "판매자 추천 핫딜",
      description: "조회수 높은 상품을 빠르게 비교해 보고 바로 이동하세요.",
      image: heroFallbackImages[1],
      badge: "광고",
      display_seconds: 4,
      transition_style: "slide_lr",
    },
    {
      id: "hero-fallback-3",
      title: "중고장터 베스트",
      description: "검토 완료된 인기 중고상품을 카테고리별로 확인할 수 있습니다.",
      image: heroFallbackImages[2],
      badge: "광고",
      display_seconds: 4,
      transition_style: "fade",
    },
    {
      id: "hero-fallback-4",
      title: "커뮤니티 지금 화제글",
      description: "구매자/판매자 커뮤니티 최신 글을 한 번에 살펴보세요.",
      image: heroFallbackImages[3],
      badge: "광고",
      display_seconds: 4,
      transition_style: "wipe",
    },
  ];

  const activeHeroSlides: HeroSlide[] =
    configuredHeroSlides.length > 0 ? (configuredHeroSlides as HeroSlide[]) : (fallbackHeroSlides as HeroSlide[]);

  const productSections = homeSections
    .map((section) => {
      const keyword = section.category_keyword.trim();
      const limit = Math.min(section.item_limit || 30, 30);
      const sourceItems =
        section.source_type === "hotdeal"
          ? (() => {
              const sorted = [...hotdeals].sort((left, right) => right.view_count - left.view_count);
              const filtered = keyword ? sorted.filter((item) => item.category_name?.includes(keyword)) : sorted;
              const candidate = filtered.length > 0 ? filtered : sorted;
              return candidate.slice(0, limit).map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: `${item.category_name || "핫딜"} · 조회 ${item.view_count}`,
                image: resolveMediaUrl(item.image || getProductPlaceholder("hotdeal", item.category_name)),
                href: `/hotdeals/${item.id}`,
                price: `₩${Number(item.sale_price).toLocaleString("ko-KR")}`,
              }));
            })()
          : (() => {
              const sorted = [...marketplaceItems].sort((left, right) => right.view_count - left.view_count);
              const filtered = keyword ? sorted.filter((item) => item.category_name?.includes(keyword)) : sorted;
              const candidate = filtered.length > 0 ? filtered : sorted;
              return candidate.slice(0, limit).map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: `${item.category_name || "상품"} · 조회 ${item.view_count}`,
                image: resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name)),
                href: `/marketplace/${item.id}`,
                price: `₩${Number(item.price).toLocaleString("ko-KR")}`,
              }));
            })();

      return {
        ...section,
        items: sourceItems,
      };
    });

  return (
    <section className="space-y-10">
      <HeroCarousel slides={activeHeroSlides} />

      {productSections.map((section) => (
        <HomeProductSection
          key={section.id}
          title={section.title}
          description={section.description}
          items={section.items}
        />
      ))}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--ink)]">최근 구매자커뮤니티</h2>
            {buyerBoard ? (
              <Link href={`/boards/${buyerBoard.slug}`} className="text-sm font-semibold text-[var(--brand)]">
                더보기
              </Link>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {buyerPosts.length ? (
              buyerPosts.slice(0, 5).map((post) => (
                <Link key={post.id} href={`/boards/${buyerBoard?.slug ?? "buyer-community"}/${post.id}`} className="block border-b border-[var(--border)] py-3 last:border-b-0">
                  <p className="font-medium text-[var(--ink)]">{post.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{post.author_nickname}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">아직 등록된 글이 없습니다.</p>
            )}
          </div>
        </section>

        <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--ink)]">최근 판매자커뮤니티</h2>
            {sellerBoard ? (
              <Link href={`/boards/${sellerBoard.slug}`} className="text-sm font-semibold text-[var(--brand)]">
                더보기
              </Link>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {sellerPosts.length ? (
              sellerPosts.slice(0, 5).map((post) => (
                <Link key={post.id} href={`/boards/${sellerBoard?.slug ?? "seller-community"}/${post.id}`} className="block border-b border-[var(--border)] py-3 last:border-b-0">
                  <p className="font-medium text-[var(--ink)]">{post.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{post.author_nickname}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-500">아직 등록된 글이 없습니다.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
