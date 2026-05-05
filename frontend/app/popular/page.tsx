import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { getBoards, getBoardPosts, PostSummary } from "@/lib/api";

export const dynamic = "force-dynamic";

type PopularPost = PostSummary & {
  boardName: string;
  boardSlug: string;
};

export default async function PopularPage() {
  const boards = await getBoards().catch(() => []);
  const communityBoards = boards.filter((board) => !["hotdeal", "marketplace"].includes(board.board_type));

  const postGroups = await Promise.all(
    communityBoards.map(async (board) => {
      const posts = await getBoardPosts(board.slug).catch(() => []);
      return posts.map((post) => ({
        ...post,
        boardName: board.name,
        boardSlug: board.slug,
      }));
    })
  );

  const popularPosts = postGroups
    .flat()
    .sort((left, right) => (right.likes + right.views) - (left.likes + left.views))
    .slice(0, 20) as PopularPost[];

  return (
    <section className="space-y-8">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "인기글" },
        ]}
      />
      <div className="rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--brand)]">Popular Feed</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">인기글</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          현재 게시판 글 중 조회수와 추천수를 기준으로 상위 게시글을 모았습니다.
        </p>
      </div>
      <div className="grid gap-4">
        {popularPosts.map((post, index) => (
          <Link
            key={`${post.boardSlug}-${post.id}`}
            href={`/boards/${post.boardSlug}/${post.id}`}
            className="rounded-[0.58rem] border border-[var(--border)] bg-white p-6 shadow-soft transition hover:-translate-y-1"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">
                  #{index + 1} · {post.boardName}
                </p>
                <h2 className="mt-2 text-2xl font-bold">{post.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{post.author_nickname} · {new Date(post.created_at).toLocaleString("ko-KR")}</p>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">조회 {post.views}</span>
                <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">추천 {post.likes}</span>
                <span className="rounded-full bg-[var(--muted)] px-3 py-1.5">댓글 {post.comment_count}</span>
              </div>
            </div>
          </Link>
        ))}
        {popularPosts.length === 0 ? (
          <div className="rounded-[0.58rem] border border-[var(--border)] bg-white p-8 text-center text-sm text-slate-500 shadow-soft">
            아직 집계할 인기글이 없습니다.
          </div>
        ) : null}
      </div>
    </section>
  );
}
