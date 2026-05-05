"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PageNavigator } from "@/components/layout/page-navigator";
import { getStoredTokens } from "@/lib/auth";
import { BoardItem, createPost, getBoardDetail } from "@/lib/api";

type WritePageProps = {
  params: { slug: string };
};

export default function WritePage({ params }: WritePageProps) {
  const router = useRouter();
  const [board, setBoard] = useState<BoardItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getBoardDetail(params.slug)
      .then((item) => setBoard(item))
      .catch(() => setError("게시판을 찾을 수 없습니다."));
  }, [params.slug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setError("로그인 후 게시글을 작성할 수 있습니다.");
      setLoading(false);
      router.push("/login");
      return;
    }

    try {
      // 에디터는 추후 교체 가능하도록 현재는 텍스트 영역 기반으로 둔다.
      const post = await createPost(params.slug, { title, content, images });
      router.push(`/boards/${params.slug}/${post.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "게시글 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl rounded-[0.67rem] border border-[var(--border)] bg-white/95 p-8 shadow-soft">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: board?.slug === "notice" ? "공지" : "커뮤니티", href: board?.slug === "notice" ? "/boards/notice" : "/boards" },
          ...(board ? [{ label: board.name, href: `/boards/${params.slug}` }] : []),
          { label: "글쓰기" },
        ]}
      />
      <h1 className="text-3xl font-bold">{board ? `${board.name} 글쓰기` : "글쓰기"}</h1>
      {board?.description ? <p className="mt-3 text-sm text-slate-600">{board.description}</p> : null}
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">제목</span>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">본문</span>
          <textarea
            rows={14}
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-4 outline-none"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">이미지 첨부</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(event) => setImages(event.target.files)}
            className="block w-full rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-[5px] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "저장 중..." : "게시글 등록"}
        </button>
      </form>
    </section>
  );
}
