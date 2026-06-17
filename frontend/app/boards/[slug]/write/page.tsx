"use client";

import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";

import { LiveBroadcastFields } from "@/components/board/live-broadcast-fields";
import { ShoppingMallFields } from "@/components/board/shopping-mall-fields";
import { PageNavigator } from "@/components/layout/page-navigator";
import { getStoredTokens } from "@/lib/auth";
import { BoardItem, createPost, getBoardDetail, ProductLiveStatus, resolveMediaUrl, uploadInlineImage } from "@/lib/api";

type WritePageProps = {
  params: { slug: string };
};

const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) {
            return {};
          }
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

const FONT_SIZE_OPTIONS = [
  { label: "작게", value: "14px" },
  { label: "기본", value: "16px" },
  { label: "크게", value: "20px" },
  { label: "매우 크게", value: "24px" },
];

export default function WritePage({ params }: WritePageProps) {
  const router = useRouter();
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getBoardDetail(params.slug)
      .then((item) => setBoard(item))
      .catch(() => setError("게시판을 찾을 수 없습니다."));
  }, [params.slug]);

  const isProductBoard = board?.board_type === "product";
  const isLiveSpecialBoard = isProductBoard && board?.product_board_type === "live_special";

  // Tiptap Rich Text Editor (WYSIWYG, inline images, full formatting)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We control some marks via separate extensions below
      }),
      Underline,
      TextStyleWithFontSize,
      Color,
      Image.configure({
        inline: false,          // 본문 삽입 이미지는 독립 블록으로 취급해 큰 이미지 주변 커서 스크롤 튐을 줄인다.
        allowBase64: false,
      }),
    ],
    content: "",
    immediatelyRender: false,   // Next.js SSR hydration 문제 방지 (Tiptap 권장)
    editorProps: {
      attributes: {
        class: "tiptap-editor prose prose-sm max-w-none focus:outline-none min-h-[220px] p-4 border border-[var(--border)] rounded-[5px] bg-white",
      },
      // Drag & Drop 이미지 처리 (에디터 영역 전체)
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer) return false;
        const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) return false;

        event.preventDefault();
        files.forEach((file) => void uploadAndInsertImageToEditor(file, editor));
        return true;
      },
      // Paste 이미지 처리
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        imageFiles.forEach((file) => void uploadAndInsertImageToEditor(file, editor));
        return true;
      },
    },
  });

  const [inlineImageUploading, setInlineImageUploading] = useState(false);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const markFirstImage = () => {
      const imageNodes = Array.from(editor.view.dom.querySelectorAll("img"));
      imageNodes.forEach((imageNode, index) => {
        if (index === 0) {
          imageNode.setAttribute("data-main-exposure", "true");
          imageNode.setAttribute("title", "메인노출");
        } else {
          imageNode.removeAttribute("data-main-exposure");
          imageNode.removeAttribute("title");
        }
      });
    };

    markFirstImage();
    editor.on("update", markFirstImage);
    editor.on("selectionUpdate", markFirstImage);

    return () => {
      editor.off("update", markFirstImage);
      editor.off("selectionUpdate", markFirstImage);
    };
  }, [editor]);

  async function uploadAndInsertImageToEditor(file: File, ed: Editor | null) {
    if (!ed) return;

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
      const imageUrl = resolveMediaUrl(uploaded.url); // /media/boards/inline/...
      // 인라인 이미지로 삽입 (Tiptap Image node)
      preserveScroll(() => ed.chain().focus(undefined, { scrollIntoView: false }).setImage({ src: imageUrl, alt: "본문 이미지" }).run());
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "본문 이미지 업로드에 실패했습니다.");
    } finally {
      setInlineImageUploading(false);
    }
  }

  async function handleInlineImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (files.length === 0) return;
    for (const file of files) {
      await uploadAndInsertImageToEditor(file, editor);
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    const finalContent = editor?.getHTML() || "";
    if (!finalContent.trim() || finalContent === "<p></p>") {
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

  function preserveScroll(action: () => void) {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    action();
    window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
  }

  function runEditorCommand(action: (ed: Editor) => void) {
    if (!editor) {
      return;
    }
    preserveScroll(() => action(editor));
  }

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
            <p className="text-xs text-slate-500 md:col-span-2">
              본문에 삽입한 첫 번째 이미지가 메인 순위 노출 이미지로 사용됩니다. 에디터 안 첫 이미지에는 “메인노출” 표시가 붙습니다.
            </p>
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
        <div className="block space-y-2">
          <span className="text-sm font-medium">본문 (Rich Text — Tiptap)</span>

          {/* Toolbar: Bold / Italic / Underline / Strike / Color / Image insert */}
          <div className="flex flex-wrap items-center gap-1 rounded border border-[var(--border)] bg-white p-1">
            <button
              type="button"
              onClick={() => runEditorCommand((ed) => ed.chain().focus(undefined, { scrollIntoView: false }).toggleBold().run())}
              className={`rounded px-2 py-1 text-xs font-semibold ${editor?.isActive("bold") ? "bg-[var(--brand)] text-white" : "hover:bg-[var(--muted)]"}`}
              title="굵게 (Bold)"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => runEditorCommand((ed) => ed.chain().focus(undefined, { scrollIntoView: false }).toggleItalic().run())}
              className={`rounded px-2 py-1 text-xs italic ${editor?.isActive("italic") ? "bg-[var(--brand)] text-white" : "hover:bg-[var(--muted)]"}`}
              title="기울임 (Italic)"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => runEditorCommand((ed) => ed.chain().focus(undefined, { scrollIntoView: false }).toggleUnderline().run())}
              className={`rounded px-2 py-1 text-xs underline ${editor?.isActive("underline") ? "bg-[var(--brand)] text-white" : "hover:bg-[var(--muted)]"}`}
              title="밑줄 (Underline)"
            >
              U
            </button>
            <button
              type="button"
              onClick={() => runEditorCommand((ed) => ed.chain().focus(undefined, { scrollIntoView: false }).toggleStrike().run())}
              className={`rounded px-2 py-1 text-xs line-through ${editor?.isActive("strike") ? "bg-[var(--brand)] text-white" : "hover:bg-[var(--muted)]"}`}
              title="취소선 (Strike)"
            >
              S
            </button>

            {/* Color picker */}
            <input
              type="color"
              onChange={(e) => runEditorCommand((ed) => ed.chain().focus(undefined, { scrollIntoView: false }).setColor(e.target.value).run())}
              className="h-7 w-8 cursor-pointer rounded border border-[var(--border)] bg-white p-0.5"
              title="글자 색상"
            />

            <select
              defaultValue=""
              onChange={(event) => {
                const fontSize = event.target.value;
                if (!fontSize) {
                  return;
                }
                runEditorCommand((ed) => ed.chain().focus(undefined, { scrollIntoView: false }).setMark("textStyle", { fontSize }).run());
                event.target.value = "";
              }}
              className="h-7 rounded border border-[var(--border)] bg-white px-2 text-xs"
              title="글자 크기"
            >
              <option value="" disabled>
                글자 크기
              </option>
              {FONT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="mx-1 h-4 w-px bg-[var(--border)]" />

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
              disabled={inlineImageUploading || !editor}
              onClick={() => inlineImageInputRef.current?.click()}
              className="rounded-[4px] border border-[var(--border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)] disabled:opacity-60"
            >
              {inlineImageUploading ? "업로드 중..." : "이미지 삽입"}
            </button>
            <span className="ml-2 text-[10px] text-slate-500">
              드래그&amp;드롭 또는 붙여넣기로 이미지를 에디터 안에 바로 넣을 수 있습니다.
            </span>
          </div>

          {/* The actual live WYSIWYG editor — no separate preview pane */}
          <div className="rounded-[5px] border border-[var(--border)] bg-white">
            <EditorContent editor={editor} />
          </div>
          <p className="text-[10px] text-slate-400">글자 스타일 + 본문 이미지 지원. Backspace로 이미지 삭제, Enter로 줄바꿈.</p>
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
