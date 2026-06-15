"use client";

import React, { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LiveBroadcastFields } from "@/components/board/live-broadcast-fields";
import { ShoppingMallFields } from "@/components/board/shopping-mall-fields";
import { PageNavigator } from "@/components/layout/page-navigator";
import { getStoredTokens } from "@/lib/auth";
import { BoardItem, createPost, getBoardDetail, ProductLiveStatus, resolveMediaUrl, uploadInlineImage } from "@/lib/api";

type WritePageProps = {
  params: { slug: string };
};

export default function WritePage({ params }: WritePageProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const [board, setBoard] = useState<BoardItem | null>(null);
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inlineImageUploading, setInlineImageUploading] = useState(false);
  const [isInlineDropActive, setIsInlineDropActive] = useState(false);

  useEffect(() => {
    void getBoardDetail(params.slug)
      .then((item) => setBoard(item))
      .catch(() => setError("게시판을 찾을 수 없습니다."));
  }, [params.slug]);

  const isProductBoard = board?.board_type === "product";
  const isLiveSpecialBoard = isProductBoard && board?.product_board_type === "live_special";

  function insertContentAtCursor(markup: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${current ? "\n" : ""}${markup}\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    let nextCursor = start + markup.length;
    setContent((current) => {
      const before = current.slice(0, start);
      const after = current.slice(end);
      const prefix = before && !before.endsWith("\n") ? "\n" : "";
      const suffix = after && !after.startsWith("\n") ? "\n" : "";
      nextCursor = start + prefix.length + markup.length + suffix.length;
      return `${before}${prefix}${markup}${suffix}${after}`;
    });
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleInlineImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (files.length === 0) return;
    for (const file of files) {
      await uploadAndInsertImage(file);
    }
  }

  async function uploadAndInsertImage(file: File) {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setError("로그인 후 본문 이미지를 업로드할 수 있습니다.");
      router.push("/login");
      return;
    }

    setInlineImageUploading(true);
    setError("");
    try {
      const uploaded = await uploadInlineImage(file);
      const imageUrl = resolveMediaUrl(uploaded.url);
      insertContentAtCursor(`![본문 이미지](${imageUrl})`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "본문 이미지 업로드에 실패했습니다.");
    } finally {
      setInlineImageUploading(false);
    }
  }

  function getImageFiles(files: FileList | File[]) {
    return Array.from(files).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
  }

  function handleTextareaDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
      event.preventDefault();
      event.stopPropagation();
      setIsInlineDropActive(true);
    }
  }

  function handleTextareaDragLeave(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsInlineDropActive(false);
  }

  async function handleTextareaDrop(event: DragEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsInlineDropActive(false);
    const files = getImageFiles(event.dataTransfer.files);
    if (files.length === 0) return;
    for (const file of files) {
      await uploadAndInsertImage(file);
    }
  }

  async function handleTextareaPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (["image/jpeg", "image/png", "image/webp"].includes(items[i].type)) {
        const imageFile = items[i].getAsFile();
        if (imageFile) imageFiles.push(imageFile);
      }
    }
    if (imageFiles.length === 0) return;
    event.preventDefault();
    for (const file of imageFiles) {
      await uploadAndInsertImage(file);
    }
  }

  // Live preview renderer: parses only markdown images safely and renders real <img> + text.
  // No dangerouslySetInnerHTML for arbitrary HTML.
  function renderBodyPreview(text: string) {
    const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = imagePattern.exec(text)) !== null) {
      const [raw, alt, src] = match;
      if (match.index > lastIndex) {
        nodes.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {text.slice(lastIndex, match.index)}
          </span>
        );
      }
      const resolved = resolveMediaUrl(src);
      nodes.push(
        <img
          key={`img-${match.index}`}
          src={resolved}
          alt={alt || "본문 이미지"}
          className="my-2 max-h-[400px] w-full rounded border border-[var(--border)] object-contain"
        />
      );
      lastIndex = match.index + raw.length;
    }

    if (lastIndex < text.length) {
      nodes.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return nodes.length > 0 ? nodes : <span className="text-slate-400 text-sm">본문 미리보기가 여기에 표시됩니다.</span>;
  }

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
      const post = await createPost(params.slug, {
        title,
        content,
        images,
        product_original_price: isProductBoard ? productOriginalPrice : "",
        product_sale_price: isProductBoard ? productSalePrice : "",
        product_live_url: isProductBoard ? productLiveUrl.trim() : "",
        product_store_name: isProductBoard ? productStoreName.trim() : "",
        product_live_platform: isLiveSpecialBoard ? productLivePlatform.trim() : "",
        product_live_channel: isLiveSpecialBoard ? productLiveChannel.trim() : "",
        product_live_starts_at: isLiveSpecialBoard ? productLiveStartsAt : "",
        product_live_ends_at: isLiveSpecialBoard ? productLiveEndsAt : "",
        product_live_status: isLiveSpecialBoard ? productLiveStatus : "",
        product_live_benefit: isLiveSpecialBoard ? productLiveBenefit.trim() : "",
        product_live_button_label: isLiveSpecialBoard ? productLiveButtonLabel.trim() : "",
      });
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
          { label: board?.slug === "notice" ? "공지" : board?.board_type === "product" ? "상품게시판" : "커뮤니티", href: board?.slug === "notice" ? "/boards/notice" : "/boards" },
          ...(board ? [{ label: board.name, href: `/boards/${params.slug}` }] : []),
          { label: "글쓰기" },
        ]}
      />
      <h1 className="text-3xl font-bold">{board ? `${board.name} 글쓰기` : "글쓰기"}</h1>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">제목</span>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3 outline-none"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        {isProductBoard ? (
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
            {isLiveSpecialBoard ? (
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
          <span className="text-sm font-medium">본문 (이미지 본문 삽입 지원)</span>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <input
              ref={inlineImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(event) => void handleInlineImageSelect(event)}
            />
            <button
              type="button"
              disabled={inlineImageUploading}
              onClick={() => inlineImageInputRef.current?.click()}
              className="rounded-[5px] border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--muted)] disabled:opacity-60"
            >
              {inlineImageUploading ? "이미지 업로드 중..." : "본문 이미지 삽입"}
            </button>
            <span className="self-center text-[10px] text-slate-500">JPG, PNG, WEBP / 8MB 이하. 커서 위치에 이미지가 삽입됩니다.</span>
          </div>
          <textarea
            ref={textareaRef}
            rows={14}
            className={`w-full rounded-[5px] border px-4 py-4 font-mono text-sm outline-none transition ${
              isInlineDropActive
                ? "border-[var(--brand)] bg-emerald-50 ring-2 ring-[var(--brand)]/20"
                : "border-[var(--border)]"
            }`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onDragOver={handleTextareaDragOver}
            onDragLeave={handleTextareaDragLeave}
            onDrop={handleTextareaDrop}
            onPaste={handleTextareaPaste}
            placeholder="본문 작성... 버튼으로 이미지를 올리거나, 이 창에 이미지를 끌어다 놓거나, 클립보드 이미지를 붙여넣을 수 있습니다."
          />
        </label>

        {/* 본문 미리보기: content의 markdown 이미지 패턴을 실제 <img>로 안전 렌더링.
            텍스트는 줄바꿈 유지. 업로드 즉시 표시되지만, "게시글 등록" 전까지는 게시물이 공개되지 않음. */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">본문 미리보기</div>
          <div className="min-h-[80px] rounded-[5px] border border-[var(--border)] bg-white p-3 text-sm">
            {renderBodyPreview(content)}
          </div>
          <p className="text-[10px] text-slate-400">이미지 업로드 후 여기에서 즉시 확인하세요. 최종 등록 버튼을 눌러야 게시글이 저장·공개됩니다.</p>
        </div>

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
