import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { getBoardDetail, getBoardPosts, resolveMediaUrl } from "@/lib/api";

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

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: board.slug === "notice" ? "공지" : "커뮤니티", href: board.slug === "notice" ? "/boards/notice" : "/boards" },
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
    </section>
  );
}
