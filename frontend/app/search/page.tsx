import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { unifiedSearch } from "@/lib/api";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const result = await unifiedSearch(q).catch(() => ({ query: q, posts: [], hotdeals: [], marketplace: [] }));

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "통합검색" },
          ...(result.query ? [{ label: result.query }] : []),
        ]}
      />
      <div className="rounded-[0.67rem] border border-[var(--border)] bg-white/90 p-8 shadow-soft">
        <h1 className="text-3xl font-bold">통합 검색</h1>
        <p className="mt-3 text-sm text-slate-600">검색어: {result.query || "입력 없음"}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">게시글</h2>
          <div className="mt-4 space-y-3">
            {result.posts.length > 0 ? result.posts.map((post) => (
              <Link key={post.id} href={`/boards/${post.board_slug}/${post.id}`} className="block rounded-xl bg-[var(--muted)]/50 p-3">
                <p className="font-medium">{post.title}</p>
                <p className="mt-1 text-xs text-slate-500">{post.board_name} · {post.author_nickname}</p>
              </Link>
            )) : <p className="text-sm text-slate-500">결과 없음</p>}
          </div>
        </div>
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">핫딜</h2>
          <div className="mt-4 space-y-3">
            {result.hotdeals.length > 0 ? result.hotdeals.map((item) => (
              <Link key={item.id} href={`/hotdeals/${item.id}`} className="block rounded-xl bg-[var(--muted)]/50 p-3">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.author_nickname} · 할인율 {item.discount_rate}%</p>
              </Link>
            )) : <p className="text-sm text-slate-500">결과 없음</p>}
          </div>
        </div>
        <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">중고장터</h2>
          <div className="mt-4 space-y-3">
            {result.marketplace.length > 0 ? result.marketplace.map((item) => (
              <Link key={item.id} href={`/marketplace/${item.id}`} className="block rounded-xl bg-[var(--muted)]/50 p-3">
                <p className="font-medium">{item.title}</p>
                <div className="mt-1 text-xs text-slate-500">
                  {item.region} ·{" "}
                  {item.original_price ? <span className="mr-1 line-through">{Number(item.original_price).toLocaleString("ko-KR")}원</span> : null}
                  <span className="font-semibold text-[var(--brand)]">{Number(item.price).toLocaleString("ko-KR")}원</span>
                </div>
              </Link>
            )) : <p className="text-sm text-slate-500">결과 없음</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
