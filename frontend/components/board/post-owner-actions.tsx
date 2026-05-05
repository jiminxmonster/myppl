"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deletePost } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type PostOwnerActionsProps = {
  postId: number;
  authorId: number;
  boardSlug: string;
  editHref: string;
};

export function PostOwnerActions({ postId, authorId, boardSlug, editHref }: PostOwnerActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const user = useAuthStore((state) => state.user);
  const isOperator = !!user && ["moderator", "admin", "superadmin"].includes(user.operator_role ?? "");
  const canManage = !!user && (user.id === authorId || isOperator);

  if (!canManage) {
    return null;
  }

  const handleDelete = () => {
    if (!window.confirm("이 게시글을 삭제할까요?")) {
      return;
    }
    startTransition(async () => {
      try {
        await deletePost(postId);
        router.push(`/boards/${boardSlug}`);
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : "게시글 삭제에 실패했습니다.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={editHref}
        className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700"
      >
        수정
      </Link>
      <button
        type="button"
        disabled={isPending}
        onClick={handleDelete}
        className="rounded-[5px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
      >
        {isPending ? "삭제 중..." : "삭제"}
      </button>
    </div>
  );
}
