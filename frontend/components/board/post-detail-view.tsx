"use client";

import type React from "react";
import { useEffect, useState } from "react";

import { getPostDetail, PostDetail, resolveMediaUrl } from "@/lib/api";
import { CommentSection } from "@/components/board/comment-section";
import { PostLikeButton } from "@/components/board/post-like-button";
import { PostOwnerActions } from "@/components/board/post-owner-actions";
import { ProductLiveActions } from "@/components/board/product-live-actions";
import { PostReportButton } from "@/components/board/post-report-button";
import { formatKoreanDateTime, getProductLiveStatusLabel } from "@/lib/live-broadcast";

type PostDetailViewProps = {
  slug: string;
  postId: string;
  initialPost: PostDetail;
};

function renderPostContent(content: string) {
  // Rich Text HTML을 직접 렌더 (backend sanitize済み)
  // 이미지 태그 등 모든 스타일/인라인 이미지가 그대로 복원됨
  if (!content) return null;

  // 간단 sanitization은 backend에서 이미 수행. frontend에서는 신뢰하고 렌더.
  return (
    <div
      className="prose prose-sm max-w-none text-base leading-8 text-slate-800"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export function PostDetailView({ slug, postId, initialPost }: PostDetailViewProps) {
  const [post, setPost] = useState(initialPost);
  const isProductPost = post.board_type === "product";
  const primaryImage = post.images[0] ?? null;
  const galleryImages = isProductPost ? post.images.slice(1) : post.images;
  const originalPrice = post.product_original_price ? Number(post.product_original_price).toLocaleString("ko-KR") : null;
  const salePrice = post.product_sale_price ? Number(post.product_sale_price).toLocaleString("ko-KR") : null;
  const isLiveSpecialPost = post.board_product_board_type === "live_special";
  const liveStatusLabel = getProductLiveStatusLabel(post.product_live_status);
  const liveStartLabel = formatKoreanDateTime(post.product_live_starts_at);
  const liveEndLabel = formatKoreanDateTime(post.product_live_ends_at);
  const liveButtonLabel = post.product_live_button_label || "라이브 보기";
  const liveActionUrl =
    isLiveSpecialPost &&
    post.product_live_url &&
    post.product_live_status !== "ended" &&
    post.product_live_status !== "replay"
      ? post.product_live_url
      : "";

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
        {isProductPost ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-[320px] items-center justify-center rounded-[0.5rem] border border-[var(--border)] bg-[var(--muted)] p-4">
              {primaryImage ? (
                <img
                  src={resolveMediaUrl(primaryImage.image)}
                  alt={`${post.title} 상품 이미지`}
                  className="h-full max-h-[420px] w-full object-contain"
                />
              ) : (
                <span className="text-sm text-slate-500">이미지 없음</span>
              )}
            </div>
            <aside className="space-y-4 rounded-[0.5rem] border border-[var(--border)] bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">상품 정보</p>
              {originalPrice ? <p className="text-lg text-slate-400 line-through">₩{originalPrice}</p> : null}
              <p className="text-3xl font-black text-[var(--brand)]">{salePrice ? `₩${salePrice}` : "가격 문의"}</p>
              {isLiveSpecialPost ? (
                <div className="space-y-3 border-t border-[var(--border)] pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-500">방송 상태</span>
                    <span className="rounded-[4px] bg-[var(--accent)] px-2 py-1 text-xs font-bold text-white">{liveStatusLabel}</span>
                  </div>
                  {post.product_live_platform ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-500">플랫폼</span>
                      <span className="text-right font-bold text-[var(--ink)]">{post.product_live_platform}</span>
                    </div>
                  ) : null}
                  {post.product_store_name ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-500">쇼핑몰</span>
                      <span className="text-right font-bold text-[var(--ink)]">{post.product_store_name}</span>
                    </div>
                  ) : null}
                  {post.product_live_channel ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-500">채널</span>
                      <span className="text-right font-bold text-[var(--ink)]">{post.product_live_channel}</span>
                    </div>
                  ) : null}
                  {liveStartLabel || liveEndLabel ? (
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-500">방송 시간</span>
                      <p className="font-bold text-[var(--ink)]">
                        {liveStartLabel || "시작 미정"}
                        {liveEndLabel ? ` - ${liveEndLabel}` : ""}
                      </p>
                    </div>
                  ) : null}
                  {post.product_live_benefit ? (
                    <p className="rounded-[5px] bg-white px-3 py-2 font-semibold text-[var(--brand)]">{post.product_live_benefit}</p>
                  ) : null}
                </div>
              ) : null}
              {liveActionUrl ? (
                <ProductLiveActions title={post.title} liveUrl={liveActionUrl} buttonLabel={liveButtonLabel} />
              ) : null}
            </aside>
          </div>
        ) : null}
        <div className="mt-8 text-base leading-8 text-slate-800">{renderPostContent(post.content)}</div>
        {galleryImages.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {galleryImages.map((image) => (
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
