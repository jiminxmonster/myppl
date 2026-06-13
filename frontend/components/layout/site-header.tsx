"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, Settings, User } from "lucide-react";

import { BoardItem, getBoards } from "@/lib/api";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { SearchBar } from "@/components/layout/search-bar";
import { useAuthStore } from "@/store/authStore";

const fallbackTopBoards: BoardItem[] = [
  {
    id: -1,
    name: "판매자공유핫이슈",
    slug: "seller-hot-issues",
    parent_id: null,
    board_type: "product",
    product_board_type: "standard",
    audience: "all",
    allowed_writer_roles: ["all"],
    description: "",
    show_in_top_menu: true,
    child_count: 0,
    sort_order: 0
  },
  {
    id: -2,
    name: "소비자공유핫이슈",
    slug: "buyer-community",
    parent_id: null,
    board_type: "product",
    product_board_type: "standard",
    audience: "all",
    allowed_writer_roles: ["all"],
    description: "",
    show_in_top_menu: true,
    child_count: 0,
    sort_order: 1
  }
];

function getTopMenuLabel(board: BoardItem) {
  // Use the exact name from admin settings (DB) for consistency with admin panel.
  return board.name;
}

export function SiteHeader() {
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const [boards, setBoards] = useState<BoardItem[]>(fallbackTopBoards);
  const isOperator = ["moderator", "admin", "superadmin"].includes(user?.operator_role ?? "");

  const noticeBoard = boards.find((board) => board.slug === "notice");
  const visibleBoards = boards.filter((board) => board.board_type !== "hotdeal" && board.board_type !== "marketplace");
  const topCommunityBoards = visibleBoards
    .filter((board) => board.show_in_top_menu && !board.parent_id)
    .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.id - right.id);
  const activeParentBoard =
    topCommunityBoards.find((board) => pathname.startsWith(`/boards/${board.slug}`)) ??
    topCommunityBoards.find((board) =>
      visibleBoards.some(
        (child) => child.parent_id === board.id && pathname.startsWith(`/boards/${child.slug}`)
      )
    ) ??
    null;
  const currentSubBoards = activeParentBoard
    ? visibleBoards.filter((board) => board.parent_id === activeParentBoard.id)
    : [];
  const isNoticePath = pathname.startsWith("/boards/notice");
  const showCommunitySubmenu = useMemo(
    () => pathname.startsWith("/boards") && !isNoticePath && currentSubBoards.length > 0,
    [pathname, isNoticePath, currentSubBoards.length]
  );
  const showSecondaryActions =
    !isLoggedIn || (!isOperator && (user?.member_type === "seller" || user?.member_type === "buyer"));

  useEffect(() => {
    let mounted = true;

    const loadBoards = async () => {
      try {
        const items = await getBoards();
        if (mounted) {
          setBoards(items);
        }
      } catch {
        if (mounted) {
          setBoards(fallbackTopBoards);
        }
      }
    };

    void loadBoards();

    const handleBoardUpdate = () => {
      void loadBoards();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "community:boards-updated") {
        void loadBoards();
      }
    };
    const handleFocus = () => {
      void loadBoards();
    };
    window.addEventListener("community:boards-updated", handleBoardUpdate);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener("community:boards-updated", handleBoardUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return (
    <header className="rounded-[0.67rem] border border-[var(--border)] bg-white/80 px-5 py-4 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center">
              <img
                src="/branding/ppl_b.svg"
                alt="myppl"
                className="h-auto w-[110px] max-w-full"
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <NotificationDropdown />
                <Link
                  href="/mypage"
                  aria-label="개인프로필"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-[var(--border)] text-slate-700 hover:bg-[var(--muted)]"
                >
                  <User className="h-4 w-4" />
                </Link>
                {isOperator ? (
                  <Link
                    href="/admin-panel"
                    aria-label="설정"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-[var(--border)] text-slate-700 hover:bg-[var(--muted)]"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                ) : null}
                {!isOperator && user?.member_type === "seller" ? (
                  <Link
                    href="/seller-products"
                    className="rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm text-slate-700 hover:bg-[var(--muted)]"
                  >
                    내판매상품
                  </Link>
                ) : null}
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-[5px] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-3">
            <SearchBar />
            <nav className="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-700">
              {topCommunityBoards.map((board) => (
                <Link key={board.id} href={`/boards/${board.slug}`} className="rounded-[5px] px-4 py-2 hover:bg-[var(--muted)]">
                  {getTopMenuLabel(board)}
                </Link>
              ))}
              {noticeBoard ? (
                <Link href={`/boards/${noticeBoard.slug}`} className="rounded-[5px] px-4 py-2 hover:bg-[var(--muted)]">
                  공지
                </Link>
              ) : null}
            </nav>
          </div>
          {showSecondaryActions && isLoggedIn ? (
            <div className="flex items-center justify-center gap-2">
              {!isOperator && user?.member_type === "buyer" ? (
                <Link
                  href="/wanted-products"
                  className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-slate-700"
                >
                  원하는상품
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {showCommunitySubmenu ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3 text-sm">
            <span className="pr-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{activeParentBoard?.name}</span>
            {currentSubBoards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.slug}`}
                className="rounded-[5px] bg-[var(--muted)] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[var(--brand)] hover:text-white"
              >
                {board.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
