import Link from "next/link";

import { PageNavigator } from "@/components/layout/page-navigator";
import { getBoards } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function WriteEntryPage() {
  const boards = await getBoards().catch(() => []);

  const options = [
    ...boards
      .filter((board) => board.board_type === "general" || board.board_type === "notice")
      .map((board) => ({
        title: board.name,
        description: board.description || "게시판에 일반 글을 작성합니다.",
        href: `/boards/${board.slug}/write`,
      })),
    {
      title: "핫딜 등록",
      description: "가격과 만료일, 대표 이미지를 포함한 핫딜을 등록합니다.",
      href: "/hotdeals",
    },
    {
      title: "중고장터 등록",
      description: "판매글과 대표 이미지를 포함한 장터 게시물을 등록합니다.",
      href: "/marketplace",
    },
  ];

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "글쓰기" },
        ]}
      />
      <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">어디에 글을 작성할까요?</h1>
        <p className="mt-3 text-sm text-slate-600">게시판, 핫딜, 중고장터 중 작성할 공간을 선택하세요.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="rounded-[0.58rem] border border-[var(--border)] bg-white p-6 shadow-soft transition hover:-translate-y-1"
          >
            <h2 className="text-xl font-bold">{option.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{option.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
