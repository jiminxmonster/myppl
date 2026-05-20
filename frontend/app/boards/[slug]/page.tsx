import Link from "next/link";

import { SafeImage } from "@/components/common/safe-image";
import { PageNavigator } from "@/components/layout/page-navigator";
import { getBoardDetail, getBoardPosts, getProductPlaceholder, resolveMediaUrl } from "@/lib/api";
import { formatKoreanDateTime, getProductLiveStatusLabel } from "@/lib/live-broadcast";

type BoardPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BoardPage({ params }: BoardPageProps) {
  const { slug } = await params;
  const board = await getBoardDetail(slug).catch(() => null);
  const posts = await getBoardPosts(slug).catch(() => []);

  if (!board) {
    return <div className="rounded-xl bg-white p-8 shadow-soft">게시판을 불러오지 못했습니다.</div>;
  }

  const isProductBoard = board.board_type === "product";
  const isLiveSpecialBoard = isProductBoard && board.product_board_type === "live_special";

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: board.slug === "notice" ? "공지" : isProductBoard ? "상품게시판" : "커뮤니티", href: board.slug === "notice" ? "/boards/notice" : "/boards" },
          { label: board.name },
        ]}
        actions={
          <Link
            href={`/boards/${slug}/write`}
            className="rounded-[5px] bg-[var(--brand)] px-5 py-3 text-center text-sm font-semibold text-white"
          >
            글쓰기
          </Link>
        }
      />
      {isProductBoard ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 lg:gap-4">
          {posts.length > 0 ? (
            posts.map((post) => {
              const salePrice = post.product_sale_price ? Number(post.product_sale_price).toLocaleString("ko-KR") : null;
              const originalPrice = post.product_original_price ? Number(post.product_original_price).toLocaleString("ko-KR") : null;
              const liveStartLabel = formatKoreanDateTime(post.product_live_starts_at);
              const liveStatusLabel = getProductLiveStatusLabel(post.product_live_status);
              const liveActionUrl =
                isLiveSpecialBoard &&
                post.product_live_url &&
                post.product_live_status !== "ended" &&
                post.product_live_status !== "replay"
                  ? post.product_live_url
                  : "";
              return (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-[0.5rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-0.5"
                >
                  <Link href={`/boards/${slug}/${post.id}`} className="block">
                    <div className="relative flex aspect-square items-center justify-center bg-[var(--muted)]/30 p-2 sm:p-3">
                      {isLiveSpecialBoard ? (
                        <span className="absolute left-1.5 top-1.5 rounded-[4px] bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white sm:left-2 sm:top-2">
                          {liveStatusLabel}
                        </span>
                      ) : null}
                      <SafeImage
                        src={resolveMediaUrl(post.thumbnail_image || getProductPlaceholder("marketplace", board.name))}
                        alt={`${post.title} 상품 이미지`}
                        className="h-full w-full object-contain"
                        seed={`board-product-${post.id}-${post.title}`}
                      />
                    </div>
                    <div className="space-y-1.5 p-2 sm:p-3">
                      <p className="line-clamp-2 min-h-[2.25rem] text-[12px] font-bold leading-snug text-[var(--ink)] sm:min-h-[2.5rem] sm:text-sm">
                        {post.title}
                      </p>
                      {originalPrice ? <p className="truncate text-[11px] text-slate-400 line-through sm:text-xs">₩{originalPrice}</p> : null}
                      <p className="truncate text-sm font-black text-[var(--brand)] sm:text-base">{salePrice ? `₩${salePrice}` : "가격 문의"}</p>
                      {isLiveSpecialBoard && (post.product_store_name || liveStartLabel) ? (
                        <p className="truncate text-[10px] font-semibold text-slate-600 sm:text-xs">
                          {[post.product_store_name, liveStartLabel].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      <p className="truncate text-[10px] text-slate-500 sm:text-xs">조회 {post.views} · 댓글 {post.comment_count}</p>
                    </div>
                  </Link>
                  {liveActionUrl ? (
                    <div className="px-2 pb-2 sm:px-3 sm:pb-3">
                      <a
                        href={liveActionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-[4px] bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white sm:text-xs"
                      >
                        {post.product_live_button_label || "라이브 보기"}
                      </a>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="col-span-3 rounded-[0.67rem] border border-dashed border-[var(--border)] bg-white px-6 py-10 text-center text-sm text-slate-500 sm:col-span-4 lg:col-span-5">
              아직 등록된 상품이 없습니다.
            </div>
          )}
        </div>
      ) : (
      <div className="overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft">
        <div className="grid grid-cols-[1fr_120px_120px_100px_100px] gap-4 border-b border-[var(--border)] px-6 py-4 text-sm font-semibold text-slate-600">
          <span>제목</span>
          <span>작성자</span>
          <span>작성일</span>
          <span>조회수</span>
          <span>댓글수</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/boards/${slug}/${post.id}`}
                className="grid grid-cols-[1fr_120px_120px_100px_100px] gap-4 px-6 py-4 text-sm hover:bg-[var(--muted)]/40"
              >
                <span className="flex items-center gap-4 font-medium">
                  {post.thumbnail_image ? (
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-1">
                      <img
                        src={resolveMediaUrl(post.thumbnail_image)}
                        alt={`${post.title} 썸네일`}
                        className="h-full w-full object-contain"
                      />
                    </span>
                  ) : null}
                  <span>{post.title}</span>
                </span>
                <span>{post.author_nickname}</span>
                <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                <span>{post.views}</span>
                <span>{post.comment_count}</span>
              </Link>
            ))
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-500">아직 등록된 게시글이 없습니다.</div>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
