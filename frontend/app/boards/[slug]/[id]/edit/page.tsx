"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PageNavigator } from "@/components/layout/page-navigator";
import { getStoredTokens } from "@/lib/auth";
import { BoardItem, getBoardDetail, getPostDetail, resolveMediaUrl, updatePost } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type EditPageProps = {
  params: {
    slug: string;
    id: string;
  };
};

type ExistingImageItem = {
  id: number;
  url: string;
};

export default function EditPostPage({ params }: EditPageProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [productOriginalPrice, setProductOriginalPrice] = useState("");
  const [productSalePrice, setProductSalePrice] = useState("");
  const [productLiveUrl, setProductLiveUrl] = useState("");
  const [images, setImages] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<ExistingImageItem[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<number[]>([]);
  const [board, setBoard] = useState<BoardItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOperator = !!user && ["moderator", "admin", "superadmin"].includes(user.operator_role ?? "");

  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    async function loadPost() {
      try {
        const [post, boardItem] = await Promise.all([
          getPostDetail(params.id),
          getBoardDetail(params.slug).catch(() => null),
        ]);
        if (cancelled) {
          return;
        }

        if (user && user.id !== post.author && !isOperator) {
          setError("작성자 또는 운영자만 게시글을 수정할 수 있습니다.");
          setLoading(false);
          return;
        }

        setTitle(post.title);
        setContent(post.content);
        setProductOriginalPrice(post.product_original_price ?? "");
        setProductSalePrice(post.product_sale_price ?? "");
        setProductLiveUrl(post.product_live_url ?? "");
        setBoard(boardItem);
        setExistingImages(
          post.images.map((image) => ({
            id: image.id,
            url: resolveMediaUrl(image.image),
          }))
        );
        setRemoveImageIds([]);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "게시글을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [isOperator, params.id, router, user]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImages(event.target.files);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setError("로그인 후 게시글을 수정할 수 있습니다.");
      setSaving(false);
      router.push("/login");
      return;
    }

    try {
      const post = await updatePost(params.id, {
        title,
        content,
        images,
        removeImageIds,
        product_original_price: board?.board_type === "product" ? productOriginalPrice : "",
        product_sale_price: board?.board_type === "product" ? productSalePrice : "",
        product_live_url:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveUrl.trim() : "",
      });
      router.push(`/boards/${params.slug}/${post.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "게시글 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRemoveImage = (imageId: number) => {
    setRemoveImageIds((previous) =>
      previous.includes(imageId) ? previous.filter((id) => id !== imageId) : [...previous, imageId]
    );
  };

  if (loading) {
    return <section className="mx-auto max-w-4xl rounded-[0.67rem] border border-[var(--border)] bg-white/95 p-8 shadow-soft">불러오는 중...</section>;
  }

  return (
    <section className="mx-auto max-w-4xl rounded-[0.67rem] border border-[var(--border)] bg-white/95 p-8 shadow-soft">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: board?.slug === "notice" ? "공지" : board?.board_type === "product" ? "상품게시판" : "커뮤니티", href: board?.slug === "notice" ? "/boards/notice" : "/boards" },
          ...(board ? [{ label: board.name, href: `/boards/${params.slug}` }] : []),
          { label: "게시글 수정" },
        ]}
      />
      <h1 className="text-3xl font-bold">게시글 수정</h1>
      <p className="mt-3 text-sm text-slate-600">기존 이미지는 삭제 선택할 수 있고, 새 이미지는 추가 첨부됩니다.</p>
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
        {board?.board_type === "product" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">원래가격</span>
              <input
                type="number"
                min={0}
                className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none"
                value={productOriginalPrice}
                onChange={(event) => setProductOriginalPrice(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">지금가격</span>
              <input
                type="number"
                min={0}
                className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none"
                value={productSalePrice}
                onChange={(event) => setProductSalePrice(event.target.value)}
              />
            </label>
            {board.product_board_type === "live_special" ? (
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium">타사 라이브 방송 링크</span>
                <input
                  type="url"
                  className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none"
                  placeholder="https://..."
                  value={productLiveUrl}
                  onChange={(event) => setProductLiveUrl(event.target.value)}
                />
              </label>
            ) : null}
          </div>
        ) : null}
        {existingImages.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">기존 이미지</p>
            <div className="grid gap-4 md:grid-cols-2">
              {existingImages.map((imageItem) => {
                const selectedForRemove = removeImageIds.includes(imageItem.id);
                return (
                  <div
                    key={imageItem.id}
                    className={`space-y-3 rounded-[0.5rem] border p-3 ${
                      selectedForRemove ? "border-red-300 bg-red-50/60" : "border-[var(--border)] bg-[var(--muted)]"
                    }`}
                  >
                    <div className="flex h-40 w-full items-center justify-center">
                      <img
                        src={imageItem.url}
                        alt="기존 첨부 이미지"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRemoveImage(imageItem.id)}
                      className={`rounded-[5px] px-3 py-2 text-xs font-semibold ${
                        selectedForRemove
                          ? "border border-slate-300 bg-white text-slate-700"
                          : "border border-red-200 bg-white text-red-600"
                      }`}
                    >
                      {selectedForRemove ? "삭제 취소" : "이미지 삭제"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium">이미지 추가 첨부</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-[5px] bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "수정 저장"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/boards/${params.slug}/${params.id}`)}
            className="rounded-[5px] border border-[var(--border)] px-6 py-3 text-sm font-semibold text-slate-700"
          >
            취소
          </button>
        </div>
      </form>
    </section>
  );
}
