import Link from "next/link";

import { SafeImage } from "@/components/common/safe-image";
import { PageNavigator } from "@/components/layout/page-navigator";
import { getBoardDetail, getBoardPosts, getProductPlaceholder, resolveMediaUrl } from "@/lib/api";

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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {posts.length > 0 ? (
            posts.map((post) => {
              const salePrice = post.product_sale_price ? Number(post.product_sale_price).toLocaleString("ko-KR") : null;
              const originalPrice = post.product_original_price ? Number(post.product_original_price).toLocaleString("ko-KR") : null;
              return (
                <Link
                  key={post.id}
                  href={`/boards/${slug}/${post.id}`}
                  className="overflow-hidden rounded-[0.67rem] border border-[var(--border)] bg-white shadow-soft transition hover:-translate-y-1"
                >
                  <div className="flex aspect-square items-center justify-center bg-[var(--muted)]/30 p-4">
                    <SafeImage
                      src={resolveMediaUrl(post.thumbnail_image || getProductPlaceholder("marketplace", board.name))}
                      alt={`${post.title} 상품 이미지`}
                      className="h-full w-full object-contain"
                      seed={`board-product-${post.id}-${post.title}`}
                    />
                  </div>
                  <div className="space-y-2 p-5">
                    <p className="line-clamp-2 min-h-[3rem] text-base font-bold text-[var(--ink)]">{post.title}</p>
                    {originalPrice ? <p className="text-sm text-slate-400 line-through">₩{originalPrice}</p> : null}
                    <p className="text-xl font-black text-[var(--brand)]">{salePrice ? `₩${salePrice}` : "가격 문의"}</p>
                    <p className="text-xs text-slate-500">조회 {post.views} · 댓글 {post.comment_count}</p>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-[0.67rem] border border-dashed border-[var(--border)] bg-white px-6 py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
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
