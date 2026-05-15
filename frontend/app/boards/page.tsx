import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { getBoards } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BoardsHubPage() {
  const boards = await getBoards().catch(() => []);
  const topBoards = boards
    .filter((board) => board.show_in_top_menu && !board.parent_id)
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.id - right.id);

  return (
    <section className="space-y-8">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "커뮤니티" },
        ]}
      />

      <div className="grid gap-6">
        {topBoards.map((board) => {
          const children = boards.filter((child) => child.parent_id === board.id);
          const boardKindLabel =
            board.board_type === "product"
              ? board.product_board_type === "live_special"
                ? "Live Special Grid"
                : "Product Grid"
              : board.audience === "seller"
              ? "Seller Community"
              : "Buyer Community";

          return (
            <section key={board.id} className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">
                    {boardKindLabel}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[var(--ink)]">{board.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{board.description || "운영자가 켜고 끌 수 있는 상위 게시판입니다."}</p>
                </div>
                <Link href={`/boards/${board.slug}`} className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                  게시판 바로가기
                </Link>
              </div>

              {children.length ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/boards/${child.slug}`}
                      className="rounded-[0.5rem] border border-[var(--border)] bg-[var(--muted)]/35 p-5"
                    >
                      <h3 className="text-lg font-semibold text-[var(--ink)]">{child.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">{child.description || "운영자가 추가한 서브 게시판입니다."}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">아직 등록된 서브 게시판이 없습니다.</p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
