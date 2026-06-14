import Link from "next/link";

import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { HomeProductSection } from "@/components/home/home-product-section";
import {
  getHomeHeroSlides,
  getHomeProductSections,
  getHomeBoardSections,
  getPopularSearchKeywords,
  getBoardPosts,
  getHotdeals,
  getMarketplaceItems,
  getProductPlaceholder,
  resolveMediaUrl,
  type HomeProductSectionConfig,
  type HomeBoardSectionConfig,
} from "@/lib/api";
import { formatKoreanDateTime, getProductLiveStatusLabel } from "@/lib/live-broadcast";
import { inferShoppingMallName } from "@/lib/shopping-mall";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [heroSlides, homeSections, boardSections, hotdeals, marketplaceItems, popularSearchKeywords] = await Promise.all([
    getHomeHeroSlides().catch(() => []),
    getHomeProductSections().catch(() => []),
    getHomeBoardSections().catch(() => []),
    getHotdeals().catch(() => []),
    getMarketplaceItems().catch(() => []),
    getPopularSearchKeywords(40).catch(() => []),
  ]);

  const heroImageByTitle: Record<string, string> = {
    "비싼광고 No, 나만의 상품을 싸게 홍보한다.": "/branding/hp_01.png",
    "가격대비, 최고의 효율 광고": "/branding/hp_02.png",
    "소비자끼리 서로 공유하고, 좋은 상품 발견하자": "/branding/myppl_ad_03.svg",
  };



  const mypplHeroSlides: HeroSlide[] = [
    {
      id: "myppl-ad-1",
      title: "비싼광고 No, 나만의 상품을 싸게 홍보한다.",
      description: "판매자가 직접 올린 상품을 MYPPL 공유 핫이슈와 커뮤니티 흐름 안에서 자연스럽게 노출합니다.",
      href: "/marketplace/sell",
      image: heroImageByTitle["비싼광고 No, 나만의 상품을 싸게 홍보한다."],
      display_seconds: 4,
      transition_style: "fade",
    },
    {
      id: "myppl-ad-2",
      title: "가격대비, 최고의 효율 광고",
      description: "조회수 기반 상품 노출과 카테고리 탐색으로 광고비 대비 효율을 높입니다.",
      href: "/boards/seller-hot-issues",
      image: heroImageByTitle["가격대비, 최고의 효율 광고"],
      display_seconds: 4,
      transition_style: "slide_lr",
    },
    {
      id: "myppl-ad-3",
      title: "소비자끼리 서로 공유하고, 좋은 상품 발견하자",
      description: "구매자와 판매자가 상품 정보를 나누고 조건에 맞는 좋은 상품을 함께 발견합니다.",
      href: "/boards",
      image: heroImageByTitle["소비자끼리 서로 공유하고, 좋은 상품 발견하자"],
      display_seconds: 4,
      transition_style: "cinema",
    },
  ];

  // Respect admin hero settings from server as the source of truth.
  // Only fall back to MYPPL defaults if no active admin slides are configured.
  const activeHeroSlides: HeroSlide[] =
    heroSlides.length > 0
      ? heroSlides
          .filter((slide) => slide.is_active)
          .map((slide) => ({
            ...slide,
            image: resolveMediaUrl(slide.image_url || slide.image),
          }))
      : mypplHeroSlides;

  const fallbackHomeSections: HomeProductSectionConfig[] = [
    {
      id: 0,
      title: "최근많이 검색된 상품",
      description: "",
      source_type: "recent_search",
      board: null,
      category_keyword: "",
      item_limit: 12,
      sort_order: 0,
      is_active: true,
    },
  ];
  const configuredHomeSections: HomeProductSectionConfig[] =
    homeSections.length > 0 ? homeSections : fallbackHomeSections;
  const productBoardPostEntries = await Promise.all(
    configuredHomeSections
      .filter((section) => section.source_type === "product_board" && section.board_slug)
      .map(async (section) => ({
        sectionId: section.id,
        posts: await getBoardPosts(section.board_slug as string).catch(() => []),
      })),
  );
  const productBoardPostsBySectionId = new Map(productBoardPostEntries.map((entry) => [entry.sectionId, entry.posts]));

  const productSections = configuredHomeSections
    .map((section) => {
      const keyword = section.category_keyword.trim();
      const limit = 30;
      const hotdealCards = [...hotdeals]
        .sort((left, right) => right.view_count - left.view_count)
        .map((item) => ({
          id: item.id,
          key: `hotdeal-${item.id}`,
          title: item.title,
          category: item.category_name || "핫딜",
          marketName: inferShoppingMallName(item.source_url || item.live_url) || "MYPPL 핫딜",
          subtitle: `${item.category_name || "핫딜"} · 조회 ${item.view_count}`,
          image: resolveMediaUrl(item.image || getProductPlaceholder("hotdeal", item.category_name)),
          href: `/hotdeals/${item.id}`,
          actionLabel: item.live_url ? "라이브 방송 보기" : undefined,
          actionHref: item.live_url || undefined,
          actionExternal: Boolean(item.live_url),
          price: `₩${Number(item.sale_price).toLocaleString("ko-KR")}`,
          originalPrice: `₩${Number(item.original_price).toLocaleString("ko-KR")}`,
          viewCount: item.view_count,
        }));
      const marketplaceCards = [...marketplaceItems]
        .sort((left, right) => right.view_count - left.view_count)
        .map((item) => ({
          id: item.id,
          key: `marketplace-${item.id}`,
          title: item.title,
          category: item.category_name || "상품",
          marketName: item.source_mode === "imported" ? item.external_provider_name || "외부연동" : "MYPPL 장터",
          subtitle: `${item.category_name || "상품"} · 조회 ${item.view_count}`,
          image: resolveMediaUrl(item.image || item.external_image_url || getProductPlaceholder("marketplace", item.category_name)),
          href: `/marketplace/${item.id}`,
          price: `₩${Number(item.price).toLocaleString("ko-KR")}`,
          originalPrice: item.original_price ? `₩${Number(item.original_price).toLocaleString("ko-KR")}` : undefined,
          viewCount: item.view_count,
        }));
      const productBoardCards = [...(productBoardPostsBySectionId.get(section.id) ?? [])]
        .sort((left, right) => right.views - left.views)
        .map((item) => {
          const category = section.board_name || item.board_name || "상품게시판";
          const liveUrl =
            section.board_product_board_type === "live_special" &&
            item.product_live_url &&
            item.product_live_status !== "ended" &&
            item.product_live_status !== "replay"
              ? item.product_live_url
              : "";
          return {
            id: item.id,
            key: `board-${section.board_slug}-${item.id}`,
            title: item.title,
            category,
            marketName:
              section.board_product_board_type === "live_special"
                ? item.product_store_name || inferShoppingMallName(item.product_live_url || "") || "MYPPL 라이브"
                : item.product_store_name || "MYPPL 공유",
            subtitle:
              section.board_product_board_type === "live_special"
                ? [item.product_live_platform, formatKoreanDateTime(item.product_live_starts_at)].filter(Boolean).join(" · ") ||
                  `${category} · 조회 ${item.views}`
                : `${category} · 조회 ${item.views}`,
            image: resolveMediaUrl(item.thumbnail_image || getProductPlaceholder("marketplace", category)),
            href: `/boards/${section.board_slug}/${item.id}`,
            actionLabel: liveUrl ? item.product_live_button_label || "라이브 보기" : undefined,
            actionHref: liveUrl || undefined,
            actionExternal: Boolean(liveUrl),
            liveStatusLabel:
              section.board_product_board_type === "live_special" ? getProductLiveStatusLabel(item.product_live_status) : undefined,
            liveStatus: section.board_product_board_type === "live_special" ? item.product_live_status : undefined,
            liveBenefit: section.board_product_board_type === "live_special" ? item.product_live_benefit : undefined,
            price: item.product_sale_price ? `₩${Number(item.product_sale_price).toLocaleString("ko-KR")}` : "가격 문의",
            originalPrice: item.product_original_price ? `₩${Number(item.product_original_price).toLocaleString("ko-KR")}` : undefined,
            viewCount: item.views,
          };
        });
      const sourceItems =
        section.source_type === "recent_search"
          ? (() => {
              const combined = [...hotdealCards, ...marketplaceCards].sort((left, right) => right.viewCount - left.viewCount);
              const selected = new Map<string, (typeof combined)[number]>();
              popularSearchKeywords.forEach((search) => {
                const searchKeyword = search.keyword.trim().toLowerCase();
                if (!searchKeyword) {
                  return;
                }
                combined
                  .filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(searchKeyword))
                  .forEach((item) => {
                    if (selected.size < limit && !selected.has(item.key)) {
                      selected.set(item.key, item);
                    }
                  });
              });
              combined.forEach((item) => {
                if (selected.size < limit && !selected.has(item.key)) {
                  selected.set(item.key, item);
                }
              });
              return Array.from(selected.values()).slice(0, limit);
            })()
          : section.source_type === "hotdeal"
          ? (() => {
              const filtered = keyword ? hotdealCards.filter((item) => item.category.includes(keyword) || item.title.includes(keyword)) : hotdealCards;
              const candidate = filtered.length > 0 ? filtered : hotdealCards;
              return candidate.slice(0, limit);
            })()
          : section.source_type === "product_board"
          ? (() => {
              const filtered = keyword
                ? productBoardCards.filter((item) => item.category.includes(keyword) || item.title.includes(keyword))
                : productBoardCards;
              const candidate = filtered.length > 0 ? filtered : productBoardCards;
              return candidate.slice(0, limit);
            })()
          : (() => {
              const filtered = keyword ? marketplaceCards.filter((item) => item.category.includes(keyword) || item.title.includes(keyword)) : marketplaceCards;
              const candidate = filtered.length > 0 ? filtered : marketplaceCards;
              return candidate.slice(0, limit);
            })();

      return {
        ...section,
        items: sourceItems,
        viewAllHref:
          section.source_type === "product_board" && section.board_slug
            ? `/boards/${section.board_slug}`
            : section.source_type === "hotdeal"
            ? "/hotdeals"
            : section.source_type === "marketplace"
            ? "/marketplace"
            : undefined,
      };
    });

  const activeBoardSections = (boardSections || []).filter((s) => s.is_active);
  const boardSectionsForRender = await Promise.all(
    activeBoardSections.slice(0, 6).map(async (sec) => ({
      ...sec,
      posts: sec.board_slug ? await getBoardPosts(sec.board_slug).catch(() => []) : [],
    }))
  );

  return (
    <section className="space-y-10">
      <HeroCarousel slides={activeHeroSlides} />

      {productSections.map((section) => (
        <HomeProductSection
          key={section.id}
          title={section.title}
          description={section.description}
          items={section.items}
          viewAllHref={section.viewAllHref}
          showWhenEmpty={section.source_type === "product_board"}
        />
      ))}

      {/* 게시판노출 (Admin "게시판노출" 설정으로 제어) */}
      {boardSectionsForRender.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {boardSectionsForRender.map((sec) => {
            const spanClass = sec.columns === 3 ? "md:col-span-3" : sec.columns === 2 ? "md:col-span-2" : "";
            const posClass = sec.position === "left" ? "justify-self-start" : sec.position === "right" ? "justify-self-end" : "justify-self-center";
            return (
              <div key={sec.id} className={`rounded-[0.67rem] border border-[var(--border)] bg-white p-5 shadow-soft ${spanClass} ${posClass}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--ink)]">{sec.title}</h3>
                  {sec.board_slug && (
                    <Link href={`/boards/${sec.board_slug}`} className="text-xs font-semibold text-[var(--brand)]">더보기 →</Link>
                  )}
                </div>
                <div className="mb-2 text-[10px] text-slate-500">
                  {sec.content_mode === "best" ? "베스트컨텐츠" : "최근컨텐츠"} · {sec.columns}열 · {sec.position}
                </div>
                <div className="space-y-2 text-sm">
                  {(sec.posts || []).slice(0, sec.item_limit).map((p: any) => (
                    <Link key={p.id} href={`/boards/${sec.board_slug}/${p.id}`} className="block border-b border-[var(--border)] pb-1 last:border-b-0">
                      <div className="font-medium text-[var(--ink)] line-clamp-1">{p.title}</div>
                      <div className="text-xs text-slate-500">{p.author_nickname || ""} · 조회 {p.views || 0}</div>
                    </Link>
                  ))}
                  {(!sec.posts || sec.posts.length === 0) && <p className="text-xs text-slate-400">아직 글이 없습니다.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}
