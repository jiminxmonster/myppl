"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";

import { LiveBroadcastFields } from "@/components/board/live-broadcast-fields";
import { ShoppingMallFields } from "@/components/board/shopping-mall-fields";
import { PageNavigator } from "@/components/layout/page-navigator";
import { getStoredTokens } from "@/lib/auth";
import { BoardItem, getBoardDetail, getPostDetail, ProductLiveStatus, resolveMediaUrl, updatePost, uploadInlineImage } from "@/lib/api";
import { formatDateTimeLocal } from "@/lib/live-broadcast";
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
  const [productStoreName, setProductStoreName] = useState("");
  const [productLivePlatform, setProductLivePlatform] = useState("");
  const [productLiveChannel, setProductLiveChannel] = useState("");
  const [productLiveStartsAt, setProductLiveStartsAt] = useState("");
  const [productLiveEndsAt, setProductLiveEndsAt] = useState("");
  const [productLiveStatus, setProductLiveStatus] = useState<ProductLiveStatus>("scheduled");
  const [productLiveBenefit, setProductLiveBenefit] = useState("");
  const [productLiveButtonLabel, setProductLiveButtonLabel] = useState("라이브 보기");
  const [images, setImages] = useState<FileList | null>(null);
  const [existingImages, setExistingImages] = useState<ExistingImageItem[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<number[]>([]);
  const [board, setBoard] = useState<BoardItem | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOperator = !!user && ["moderator", "admin", "superadmin"].includes(user.operator_role ?? "");

  // Tiptap editor for body content (same as write page)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: false }),
    ],
    content: "",
    immediatelyRender: false,   // Next.js SSR hydration 문제 방지 (Tiptap 권장)
  });

  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const [inlineImageUploading, setInlineImageUploading] = useState(false);

  async function uploadAndInsertImageToEditor(file: File) {
    if (!editor) return;
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setError("로그인 후 본문 이미지를 업로드할 수 있습니다.");
      return;
    }
    setInlineImageUploading(true);
    try {
      const uploaded = await uploadInlineImage(file);
      const imageUrl = resolveMediaUrl(uploaded.url);
      editor.chain().focus().setImage({ src: imageUrl, alt: "본문 이미지" }).run();
    } catch (e: any) {
      setError(e?.message || "이미지 업로드 실패");
    } finally {
      setInlineImageUploading(false);
    }
  }

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
        setProductStoreName(post.product_store_name ?? "");
        setProductLivePlatform(post.product_live_platform ?? "");
        setProductLiveChannel(post.product_live_channel ?? "");
        setProductLiveStartsAt(formatDateTimeLocal(post.product_live_starts_at));
        setProductLiveEndsAt(formatDateTimeLocal(post.product_live_ends_at));
        setProductLiveStatus((post.product_live_status as ProductLiveStatus | "") || "scheduled");
        setProductLiveBenefit(post.product_live_benefit ?? "");
        setProductLiveButtonLabel(post.product_live_button_label || "라이브 보기");
        setBoard(boardItem);
        setExistingImages(
          post.images.map((image) => ({
            id: image.id,
            url: resolveMediaUrl(image.image),
          }))
        );
        setRemoveImageIds([]);

        // Tiptap에 기존 HTML content 복원 (수정 시 완전 복원 핵심)
        // content state도 유지 (다른 로직 호환)
        if (editor) {
          // editor가 아직 초기화 중일 수 있으므로 다음 틱에 set
          setTimeout(() => {
            if (editor && post.content) {
              editor.commands.setContent(post.content);
            }
          }, 0);
        }
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

  // 에디터가 준비되면 로드된 content 복원 (지연 로딩 대응)
  useEffect(() => {
    if (editor && content && editor.isEmpty) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

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
      const finalContent = editor?.getHTML() || content;

      const post = await updatePost(params.id, {
        title,
        content: finalContent,
        images,
        removeImageIds,
        product_original_price: board?.board_type === "product" ? productOriginalPrice : "",
        product_sale_price: board?.board_type === "product" ? productSalePrice : "",
        product_live_url: board?.board_type === "product" ? productLiveUrl.trim() : "",
        product_store_name: board?.board_type === "product" ? productStoreName.trim() : "",
        product_live_platform:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLivePlatform.trim() : "",
        product_live_channel:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveChannel.trim() : "",
        product_live_starts_at:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveStartsAt : "",
        product_live_ends_at:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveEndsAt : "",
        product_live_status:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveStatus : "",
        product_live_benefit:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveBenefit.trim() : "",
        product_live_button_label:
          board?.board_type === "product" && board.product_board_type === "live_special" ? productLiveButtonLabel.trim() : "",
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
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">제목</span>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        {board?.board_type === "product" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <ShoppingMallFields
                link={productLiveUrl}
                storeName={productStoreName}
                onLinkChange={setProductLiveUrl}
                onStoreNameChange={setProductStoreName}
              />
            </div>
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
              <LiveBroadcastFields
                platform={productLivePlatform}
                channel={productLiveChannel}
                startsAt={productLiveStartsAt}
                endsAt={productLiveEndsAt}
                status={productLiveStatus}
                benefit={productLiveBenefit}
                buttonLabel={productLiveButtonLabel}
                onPlatformChange={setProductLivePlatform}
                onChannelChange={setProductLiveChannel}
                onStartsAtChange={setProductLiveStartsAt}
                onEndsAtChange={setProductLiveEndsAt}
                onStatusChange={setProductLiveStatus}
                onBenefitChange={setProductLiveBenefit}
                onButtonLabelChange={setProductLiveButtonLabel}
              />
            ) : null}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium">본문 (Rich Text)</span>

          <div className="flex flex-wrap items-center gap-1 rounded border border-[var(--border)] bg-white p-1">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded px-2 py-1 text-xs font-semibold hover:bg-[var(--muted)]">B</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded px-2 py-1 text-xs italic hover:bg-[var(--muted)]">I</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} className="rounded px-2 py-1 text-xs underline hover:bg-[var(--muted)]">U</button>
            <button type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} className="rounded px-2 py-1 text-xs line-through hover:bg-[var(--muted)]">S</button>
            <input type="color" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} className="h-7 w-8 cursor-pointer rounded border border-[var(--border)] bg-white p-0.5" title="글자 색상" />
            <div className="mx-1 h-4 w-px bg-[var(--border)]" />
            <input ref={inlineImageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files||[]).filter(f=>f.type.startsWith('image/')); e.target.value=''; fs.forEach(f=>uploadAndInsertImageToEditor(f)); }} />
            <button type="button" disabled={inlineImageUploading || !editor} onClick={() => inlineImageInputRef.current?.click()} className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--muted)] disabled:opacity-60">
              {inlineImageUploading ? "업로드..." : "이미지 삽입"}
            </button>
          </div>

          <div className="rounded-[5px] border border-[var(--border)] bg-white">
            <EditorContent editor={editor} />
          </div>
        </label>
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
