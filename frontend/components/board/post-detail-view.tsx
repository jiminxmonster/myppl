"use client";

import { useEffect, useState } from "react";

import { getPostDetail, PostDetail, resolveMediaUrl } from "@/lib/api";
import { CommentSection } from "@/components/board/comment-section";
import { PostLikeButton } from "@/components/board/post-like-button";
import { PostOwnerActions } from "@/components/board/post-owner-actions";
import { PostReportButton } from "@/components/board/post-report-button";

type PostDetailViewProps = {
  slug: string;
  postId: string;
  initialPost: PostDetail;
};

export function PostDetailView({ slug, postId, initialPost }: PostDetailViewProps) {
  const [post, setPost] = useState(initialPost);

  useEffect(() => {
    let cancelled = false;

    void getPostDetail(postId)
      .then((latestPost) => {
        if (!cancelled) {
          setPost(latestPost);
        }
      })
      .catch(() => {
        // 초기 SSR 데이터가 있으면 조용히 유지한다.
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <section className="space-y-6">
      <article className="rounded-[0.67rem] border border-[var(--border)] bg-white/95 p-8 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <h1 className="text-3xl font-bold">{post.title}</h1>
            <p className="mt-3 text-sm text-slate-600">
              {post.author_nickname} · {new Date(post.created_at).toLocaleString("ko-KR")} · 조회 {post.views}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PostReportButton postId={post.id} />
            <PostOwnerActions postId={post.id} authorId={post.author} boardSlug={slug} editHref={`/boards/${slug}/${post.id}/edit`} />
            <PostLikeButton postId={post.id} initialLikes={post.likes} />
          </div>
        </div>
        <div className="mt-8 whitespace-pre-wrap text-base leading-8 text-slate-800">{post.content}</div>
        {post.images.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {post.images.map((image) => (
              <a
                key={image.id}
                href={resolveMediaUrl(image.image)}
                target="_blank"
                rel="noreferrer"
                className="flex h-72 items-center justify-center overflow-hidden rounded-[0.5rem] border border-[var(--border)] bg-[var(--muted)] p-3"
              >
                <img
                  src={resolveMediaUrl(image.image)}
                  alt={`${post.title} 첨부 이미지`}
                  className="h-full w-full object-contain"
                />
              </a>
            ))}
          </div>
        ) : null}
      </article>
      <CommentSection postId={post.id} initialComments={post.comments} />
    </section>
  );
}
