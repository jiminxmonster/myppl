"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { CommentNode, createComment, deleteComment } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type CommentSectionProps = {
  postId: number;
  initialComments: CommentNode[];
};

function flattenReplies(nodes: CommentNode[]): CommentNode[] {
  return nodes.flatMap((node) => [node, ...flattenReplies(node.children)]);
}

function CommentItem({
  comment,
  postId,
  rootId,
  isReply,
  onCreated,
  onDeleted,
}: {
  comment: CommentNode;
  postId: number;
  rootId?: number;
  isReply?: boolean;
  onCreated: (comment: CommentNode, parentId: number | null) => void;
  onDeleted: (commentId: number) => void;
}) {
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const user = useAuthStore((state) => state.user);
  const canDelete =
    !!user && (user.id === comment.author || ["moderator", "admin", "superadmin"].includes(user.operator_role ?? ""));

  const handleReplySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      // 보편적인 댓글 UX를 위해 답글은 항상 최상위 댓글 기준 한 단계 아래에만 저장한다.
      const created = await createComment(postId, { content, parent: rootId ?? comment.id, is_secret: isSecret });
      onCreated(created, rootId ?? comment.id);
      setContent("");
      setIsSecret(false);
      setIsReplying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("댓글을 삭제할까요?")) {
      return;
    }
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onDeleted(comment.id);
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "댓글 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={isReply ? "rounded-[5px] bg-[var(--muted)]/30 p-4" : ""}>
      <div className="space-y-3 rounded-[5px] border border-[var(--border)] bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isReply ? (
                <span className="text-xs font-semibold text-[var(--brand)]">답글</span>
              ) : null}
              <p className="text-sm font-semibold text-[var(--ink)]">{comment.author_nickname}</p>
              {comment.is_secret ? (
                <span className="rounded-[5px] border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  비밀
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="shrink-0 text-xs font-semibold text-red-600 disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsReplying((current) => !current)}
              className="shrink-0 text-xs font-semibold text-[var(--brand)]"
            >
              답글
            </button>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-700">{comment.content}</p>
        {isReplying ? (
          <form className="space-y-2 border-t border-[var(--border)] pt-3" onSubmit={handleReplySubmit}>
            <textarea
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="w-full rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none"
              placeholder="답글을 입력하세요."
            />
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-[5px] bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading ? "등록 중..." : "답글 등록"}
            </button>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={isSecret} onChange={(event) => setIsSecret(event.target.checked)} />
              비밀댓글
            </label>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function insertComment(nodes: CommentNode[], created: CommentNode, parentId: number | null): CommentNode[] {
  if (parentId === null) {
    return [...nodes, created];
  }

  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, created] };
    }

    if (node.children.length === 0) {
      return node;
    }

    return { ...node, children: insertComment(node.children, created, parentId) };
  });
}

function removeComment(nodes: CommentNode[], targetId: number): CommentNode[] {
  return nodes
    .filter((node) => node.id !== targetId)
    .map((node) => ({
      ...node,
      children: removeComment(node.children, targetId),
    }));
}

export function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isReady = useAuthStore((state) => state.isReady);

  const handleCreated = (created: CommentNode, parentId: number | null) => {
    setComments((current) => insertComment(current, created, parentId));
  };

  const handleDeleted = (commentId: number) => {
    setComments((current) => removeComment(current, commentId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoggedIn) {
      setError("댓글은 로그인 후 작성할 수 있습니다.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 최상위 댓글은 parent 없이 생성한다.
      const created = await createComment(postId, { content, parent: null, is_secret: isSecret });
      handleCreated(created, null);
      setContent("");
      setIsSecret(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "댓글 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
      <h2 className="text-2xl font-semibold">댓글</h2>
      <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
        <textarea
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full rounded-[0.5rem] border border-[var(--border)] px-4 py-3 text-sm outline-none"
          placeholder={isLoggedIn ? "댓글을 입력하세요." : "로그인 후 댓글을 작성할 수 있습니다."}
          disabled={!isReady || !isLoggedIn}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!isLoggedIn && isReady ? (
          <p className="text-sm text-slate-500">
            댓글 작성을 하려면{" "}
            <Link href="/login" className="font-semibold text-[var(--brand)] underline underline-offset-2">
              로그인
            </Link>
            이 필요합니다.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !content.trim() || !isLoggedIn || !isReady}
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "등록 중..." : "댓글 등록"}
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={isSecret} onChange={(event) => setIsSecret(event.target.checked)} />
          비밀댓글
        </label>
      </form>
      <div className="mt-8 space-y-4">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
                <CommentItem
                  comment={comment}
                  postId={postId}
                  onCreated={handleCreated}
                  onDeleted={handleDeleted}
                />
              {comment.children.length > 0 ? (
                <div className="ml-4 border-l border-[var(--border)] pl-4 sm:ml-6 sm:pl-5">
                  <div className="space-y-3">
                    {flattenReplies(comment.children).map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        postId={postId}
                        rootId={comment.id}
                        isReply
                        onCreated={handleCreated}
                        onDeleted={handleDeleted}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">아직 댓글이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
