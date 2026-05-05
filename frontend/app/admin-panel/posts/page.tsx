"use client";

import { useEffect, useState } from "react";

import {
  AdminBoard,
  AdminPost,
  blindAdminPost,
  deleteAdminPost,
  getAdminBoards,
  getAdminPosts,
  moveAdminPost,
  noticeAdminPost,
  resolveMediaUrl,
} from "@/lib/api";

export default function AdminPostsPage() {
  const [boards, setBoards] = useState<AdminBoard[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [moveTargets, setMoveTargets] = useState<Record<number, number>>({});
  const [noticeSettings, setNoticeSettings] = useState<Record<number, { notice_order: number; notice_start: string; notice_end: string }>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    void loadBoards();
  }, []);

  useEffect(() => {
    void loadPosts(selectedBoardId ?? undefined);
  }, [selectedBoardId]);

  async function loadBoards() {
    try {
      setBoards(await getAdminBoards());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "게시판 목록을 불러오지 못했습니다.");
    }
  }

  async function loadPosts(boardId?: number) {
    try {
      setPosts(await getAdminPosts(boardId));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "게시글 목록을 불러오지 못했습니다.");
    }
  }

  async function handleBlind(post: AdminPost) {
    await blindAdminPost(post.id, {
      is_blinded: !post.is_blinded,
      blind_reason: post.is_blinded ? "" : "운영 정책 검토 후 블라인드 처리",
    });
    await loadPosts(selectedBoardId ?? undefined);
  }

  async function handleNotice(post: AdminPost) {
    const setting = noticeSettings[post.id];
    await noticeAdminPost(post.id, {
      is_notice: !post.is_notice,
      notice_type: "board",
      notice_order: setting?.notice_order ?? 0,
      notice_start: setting?.notice_start || null,
      notice_end: setting?.notice_end || null,
    });
    await loadPosts(selectedBoardId ?? undefined);
  }

  async function handleMove(post: AdminPost) {
    const targetBoardId = moveTargets[post.id];
    if (!targetBoardId || targetBoardId === post.board_id) {
      return;
    }
    await moveAdminPost(post.id, targetBoardId);
    await loadPosts(selectedBoardId ?? undefined);
  }

  async function handleDelete(postId: number, mode: "soft" | "hard") {
    await deleteAdminPost(postId, mode);
    await loadPosts(selectedBoardId ?? undefined);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-5 shadow-soft">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSelectedBoardId(null)}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            전체 게시판
          </button>
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => setSelectedBoardId(board.id)}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
            >
              {board.name}
            </button>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="grid gap-4">
        {posts.map((post) => (
          <article key={post.id} className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">
                  {post.board_name} · {post.is_notice ? "공지" : "일반"} · {post.is_deleted ? "임시삭제" : "게시중"}
                </p>
                <h2 className="text-xl font-bold">{post.title}</h2>
                <p className="text-sm text-slate-600">
                  작성자 {post.author_nickname} · 조회 {post.views} · 추천 {post.likes} · 댓글 {post.comment_count}
                </p>
                {post.is_notice ? (
                  <p className="text-sm text-slate-500">
                    공지 기간 {post.notice_start ? new Date(post.notice_start).toLocaleString("ko-KR") : "즉시"} ~ {post.notice_end ? new Date(post.notice_end).toLocaleString("ko-KR") : "제한 없음"}
                  </p>
                ) : null}
              </div>
              {post.thumbnail_image ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-2">
                  <img
                    src={resolveMediaUrl(post.thumbnail_image)}
                    alt={post.title}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                type="number"
                placeholder="공지 순서"
                className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                value={noticeSettings[post.id]?.notice_order ?? 0}
                onChange={(event) =>
                  setNoticeSettings((current) => ({
                    ...current,
                    [post.id]: {
                      notice_order: Number(event.target.value),
                      notice_start: current[post.id]?.notice_start ?? "",
                      notice_end: current[post.id]?.notice_end ?? "",
                    },
                  }))
                }
              />
              <input
                type="datetime-local"
                className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                value={noticeSettings[post.id]?.notice_start ?? ""}
                onChange={(event) =>
                  setNoticeSettings((current) => ({
                    ...current,
                    [post.id]: {
                      notice_order: current[post.id]?.notice_order ?? 0,
                      notice_start: event.target.value,
                      notice_end: current[post.id]?.notice_end ?? "",
                    },
                  }))
                }
              />
              <input
                type="datetime-local"
                className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"
                value={noticeSettings[post.id]?.notice_end ?? ""}
                onChange={(event) =>
                  setNoticeSettings((current) => ({
                    ...current,
                    [post.id]: {
                      notice_order: current[post.id]?.notice_order ?? 0,
                      notice_start: current[post.id]?.notice_start ?? "",
                      notice_end: event.target.value,
                    },
                  }))
                }
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void handleBlind(post)} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                {post.is_blinded ? "블라인드 해제" : "블라인드"}
              </button>
              <button type="button" onClick={() => void handleNotice(post)} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                {post.is_notice ? "공지 해제" : "공지 고정"}
              </button>
              <button type="button" onClick={() => void handleDelete(post.id, "soft")} className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
                임시삭제
              </button>
              <button type="button" onClick={() => void handleDelete(post.id, "hard")} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                완전삭제
              </button>
              <select
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                value={moveTargets[post.id] ?? post.board_id}
                onChange={(event) => setMoveTargets((current) => ({ ...current, [post.id]: Number(event.target.value) }))}
              >
                {boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => void handleMove(post)} className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
                게시판 이동
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
