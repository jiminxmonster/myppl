import Link from "next/link";

import { getBoards, getCatalogCategories, getHotdealCategories, getMarketplaceCategories } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [boards, productCategories, hotdealCategories, marketplaceCategories] = await Promise.all([
    getBoards().catch(() => []),
    getCatalogCategories().catch(() => []),
    getHotdealCategories().catch(() => []),
    getMarketplaceCategories().catch(() => []),
  ]);
  const boardSections = boards
    .filter((board) => !["hotdeal", "marketplace", "notice"].includes(board.board_type) && board.slug !== "notice")
    .map((board) => ({
      title: board.name,
      description: board.description || "운영패널에서 생성된 커뮤니티 게시판입니다.",
      href: `/boards/${board.slug}`,
    }));
  const noticeBoard = boards.find((board) => board.slug === "notice");
  const featuredCategories = productCategories.filter((category) => !category.parent).slice(0, 8);
  const sections = [
    {
      title: "상품 카테고리",
      description: "좌측 메뉴에서 원하는 상품군을 고르면 세부 체크 항목과 관심조건 저장 흐름으로 바로 이어집니다.",
      href: featuredCategories[0] ? `/catalog/categories/${featuredCategories[0].slug}` : "/mypage/alerts",
    },
    {
      title: "인기글",
      description: "게시판 전체에서 조회수와 추천수가 높은 글을 한 번에 모아보는 피드입니다.",
      href: "/popular",
    },
    ...boardSections,
    {
      title: "핫딜",
      description: "가격 비교와 만료 처리까지 고려한 실시간 딜 피드입니다.",
      href: "/hotdeals",
    },
    {
      title: "중고장터",
      description: "거래 상태와 지역 기반으로 정리된 개인 간 거래 공간입니다.",
      href: "/marketplace",
    },
    ...(noticeBoard
      ? [
          {
            title: "공지",
            description: noticeBoard.description || "운영 공지와 필독 안내를 확인하는 공간입니다.",
            href: `/boards/${noticeBoard.slug}`,
          },
        ]
      : []),
  ];

  return (
    <section className="space-y-10">
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--brand)]">
            Product Discovery Platform
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
            원하는 상품군을 고르고, 세부 조건을 저장한 뒤, 맞는 딜이 뜨면 바로 받는 구조
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            핫딜과 중고장터 페이지에서 상품군별 좌측 카테고리 메뉴를 고르고, 세부 필터를 체크한 뒤 관심조건 저장까지
            이어지는 탐색형 구조입니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/hotdeals"
              className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
            >
              핫딜 둘러보기
            </Link>
            <Link href="/marketplace" className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold">
              중고장터 보기
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-[0.67rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand)]">Hotdeal Categories</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {hotdealCategories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/hotdeals?category=${encodeURIComponent(category.slug)}`}
                  className="border border-[var(--border)] bg-[var(--muted)]/35 p-4 transition hover:bg-[var(--muted)]/60"
                >
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{category.description || "핫딜 상품군을 빠르게 탐색할 수 있습니다."}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[0.67rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand)]">Marketplace Categories</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {marketplaceCategories.slice(0, 6).map((category) => (
                <Link
                  key={category.id}
                  href={`/marketplace?category=${encodeURIComponent(category.slug)}`}
                  className="border border-[var(--border)] bg-[var(--muted)]/35 p-4 transition hover:bg-[var(--muted)]/60"
                >
                  <h2 className="text-lg font-semibold">{category.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{category.description || "중고거래 품목군을 빠르게 탐색할 수 있습니다."}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[0.67rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand)]">Saved Workflow</p>
            <div className="mt-4 grid gap-3">
              {["상품군 선택", "세부 필터 체크", "관심조건 저장", "수집 결과 매칭", "알림 채널 발송"].map((step, index) => (
                <div key={step} className="flex items-center gap-4 border border-[var(--border)] bg-white p-4">
                  <div className="flex h-10 w-10 items-center justify-center bg-[var(--brand)] text-sm font-bold text-white">{index + 1}</div>
                  <p className="font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className="rounded-[0.5rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-soft transition hover:-translate-y-1"
            >
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{section.description}</p>
            </Link>
          ))}
        </div>
    </section>
  );
}
