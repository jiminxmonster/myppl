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
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [board, setBoard] = useState<BoardItem | null>(null);
  const [title, setTitle] = useState("");
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
  const [mainRankingImage, setMainRankingImage] = useState<File | null>(null);
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

  async function handleInlineImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (files.length === 0) return;
    for (const file of files) {
      await uploadAndInsertImage(file);
    }
  }

  function createBodyImageElement(displaySrc: string, originalSrc: string): HTMLImageElement {
    const img = document.createElement("img");
    img.src = displaySrc;
    img.alt = "본문 이미지";
    img.setAttribute("data-body-image", "true");
    img.setAttribute("data-original-src", originalSrc || displaySrc);
    img.style.display = "block";
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.margin = "8px 0";
    img.style.borderRadius = "0.5rem";
    img.style.border = "1px solid var(--border)";
    img.style.background = "#f8f8f8";
    img.setAttribute("contenteditable", "false");
    return img;
  }

  function insertImageAtCaret(displaySrc: string, originalSrc: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.focus();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      // 커서가 없으면 끝에 추가
      const img = createBodyImageElement(displaySrc, originalSrc);
      canvas.appendChild(img);
      // 이미지 뒤에 커서가 오도록 br 하나 보조
      const br = document.createElement("br");
      canvas.appendChild(br);
      updateHeroLabel();
      return;
    }

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const img = createBodyImageElement(displaySrc, originalSrc);
    range.insertNode(img);

    // 이미지 바로 뒤로 커서 이동 (이미지가 '문자열 한개'처럼 동작)
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    updateHeroLabel();
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
      // display와 markdown 원본 모두 resolve된 /media/... 경로 사용
      insertImageAtCaret(imageUrl, imageUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "본문 이미지 업로드에 실패했습니다.");
    } finally {
      setInlineImageUploading(false);
    }
  }

  function getImageFiles(files: FileList | File[]) {
    return Array.from(files).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file" && item.type.startsWith("image/"))) {
      event.preventDefault();
      event.stopPropagation();
      setIsInlineDropActive(true);
    }
  }

  function handleCanvasDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsInlineDropActive(false);
  }

  async function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsInlineDropActive(false);
    const files = getImageFiles(event.dataTransfer.files);
    if (files.length === 0) return;
    for (const file of files) {
      await uploadAndInsertImage(file);
    }
  }

  async function handleCanvasPaste(event: ClipboardEvent<HTMLDivElement>) {
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
    // 이미지 붙여넣기만 우리가 처리. 텍스트는 기본 동작 허용
    event.preventDefault();
    for (const file of imageFiles) {
      await uploadAndInsertImage(file);
    }
  }

  function updateHeroLabel() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 기존 라벨/클래스 제거 (이미지 순서 바뀌거나 삭제 시 재계산)
    canvas.querySelectorAll(".hero-caption").forEach((el) => el.remove());
    canvas.querySelectorAll("img").forEach((img) => img.classList.remove("is-hero"));

    // 가장 위(첫 번째) 이미지가 자동 메인히어로
    const firstImg = canvas.querySelector("img[data-body-image]") || canvas.querySelector("img");
    if (!firstImg) return;

    firstImg.classList.add("is-hero");

    const caption = document.createElement("span");
    caption.className = "hero-caption";
    caption.textContent = "(메인히어로이미지)";
    caption.contentEditable = "false";
    // 라벨은 이미지 바로 뒤에 붙여 시각적으로 "하단에 작은 글씨"
    if (firstImg.parentNode) {
      firstImg.parentNode.insertBefore(caption, firstImg.nextSibling);
    }
  }

  function serializeCanvasToMarkdown(canvas: HTMLDivElement | null): string {
    if (!canvas) return "";

    const parts: string[] = [];

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent || "";
        if (t) parts.push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as HTMLElement;
      if (el.classList.contains("hero-caption")) {
        return; // 라벨은 저장 내용에 포함하지 않음
      }

      const tag = el.tagName;
      if (tag === "IMG") {
        let src = el.getAttribute("data-original-src") || el.getAttribute("src") || "";
        if (src.startsWith("http://") || src.startsWith("https://")) {
          try {
            src = new URL(src).pathname;
          } catch {
            /* keep */
          }
        }
        if (src && !src.startsWith("/media/") && src.includes("/media/")) {
          src = src.slice(src.indexOf("/media/"));
        }
        parts.push(`![본문 이미지](${src})`);
        return;
      }
      if (tag === "BR") {
        parts.push("\n");
        return;
      }

      // 자식 순회 (div/p 등 엔터로 생기는 블록도 처리)
      let hadChild = false;
      for (const child of Array.from(el.childNodes)) {
        walk(child);
        hadChild = true;
      }
      if ((tag === "DIV" || tag === "P") && hadChild) {
        if (parts.length && !parts[parts.length - 1].endsWith("\n")) {
          parts.push("\n");
        }
      }
    };

    for (const child of Array.from(canvas.childNodes)) {
      walk(child);
    }

    let result = parts.join("");
    result = result.replace(/\n{3,}/g, "\n\n").trim();
    return result;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    const finalContent = serializeCanvasToMarkdown(canvasRef.current);
    if (!finalContent.trim()) {
      setError("본문을 입력해주세요.");
      return;
    }

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
      const post = await createPost(params.slug, {
        title,
        content: finalContent,
        images,
        main_ranking_image: isProductBoard ? mainRankingImage : null,
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
            required
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
            {isProductBoard && (
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium">메인 순위 노출용 이미지 (홈 상품 카드에 표시)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMainRankingImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:rounded file:border file:bg-white file:px-3 file:py-1"
                />
                {mainRankingImage && (
                  <span className="text-xs text-emerald-600">선택됨: {mainRankingImage.name} — 등록 시 메인 썸네일로 사용</span>
                )}
                <span className="text-[10px] text-slate-400">미지정 시 첫 번째 이미지 사용</span>
              </label>
            )}
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
          <span className="text-sm font-medium">본문 (이미지 실시간 삽입 — 캔버스에 커서와 함께 표시)</span>
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
            <span className="self-center text-[10px] text-slate-500">JPG, PNG, WEBP / 8MB 이하. 캔버스 안 커서 위치에 이미지가 바로 보입니다. 이미지 클릭/백스페이스로 지우기, 엔터로 아래로 내리기 가능.</span>
          </div>
          {/* 실시간 이미지 + 텍스트 혼합 캔버스. 별도 미리보기 없음. 이미지 = 문자열처럼 동작 */}
          <div
            ref={canvasRef}
            contentEditable
            className={`post-write-canvas transition ${
              isInlineDropActive
                ? "border-[var(--brand)] bg-emerald-50 ring-2 ring-[var(--brand)]/20"
                : ""
            }`}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            onPaste={handleCanvasPaste}
            onInput={() => updateHeroLabel()}
            aria-label="게시글 본문 캔버스"
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
