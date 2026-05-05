import Link from "next/link";

import { getBoards } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BoardsHubPage() {
  const boards = await getBoards().catch(() => []);
  const communityBoards = boards.filter((board) => !["hotdeal", "marketplace", "notice"].includes(board.board_type) && board.slug !== "notice");

  return (
    <section className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {communityBoards.map((board) => (
          <Link
            key={board.id}
            href={`/boards/${board.slug}`}
            className="rounded-[0.58rem] border border-[var(--border)] bg-white p-6 shadow-soft transition hover:-translate-y-1"
          >
            <h2 className="text-2xl font-bold">{board.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {board.description || "운영패널에서 생성된 커뮤니티 게시판입니다."}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
