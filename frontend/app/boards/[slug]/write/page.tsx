"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LiveBroadcastFields } from "@/components/board/live-broadcast-fields";
import { PageNavigator } from "@/components/layout/page-navigator";
import { getStoredTokens } from "@/lib/auth";
import { BoardItem, createPost, getBoardDetail, ProductLiveStatus } from "@/lib/api";

type WritePageProps = {
  params: { slug: string };
};

export default function WritePage({ params }: WritePageProps) {
  const router = useRouter();
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

  useEffect(() => {
    void getBoardDetail(params.slug)
      .then((item) => setBoard(item))
      .catch(() => setError("게시판을 찾을 수 없습니다."));
  }, [params.slug]);

  const isProductBoard = board?.board_type === "product";
  const isLiveSpecialBoard = isProductBoard && board?.product_board_type === "live_special";

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
          <div className="flex gap-2 mb-1">
            <button
              type="button"
              onClick={() => {
                // 데모용: 실제 업로드는 /boards/upload-image/ 로 POST 후 URL 받아 삽입
                // 여기서는 picsum placeholder로 본문에 <img> 태그를 삽입 (상세보기에서 HTML 렌더링)
                const url = `https://picsum.photos/seed/${Date.now()}/600/400`;
                const imgTag = `<img src="${url}" alt="본문 이미지" style="max-width:100%;height:auto;border-radius:4px;" />`;
                setContent((prev) => (prev || "") + "\n" + imgTag + "\n");
                alert("이미지 태그가 본문에 추가되었습니다. (실제 파일 업로드는 추후 연결)");
              }}
              className="text-xs px-3 py-1 border rounded hover:bg-[var(--muted)]"
            >
              📷 본문에 이미지 삽입 (데모)
            </button>
            <span className="text-[10px] text-slate-500 self-center">버튼 클릭 시 이미지 태그가 content에 들어갑니다. 상세에서 &lt;img&gt; 로 표시됩니다.</span>
          </div>
          <textarea
            rows={14}
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-4 outline-none font-mono text-sm"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="본문 작성... 이미지 삽입 버튼으로 <img> 태그를 넣으세요. (HTML 태그 지원)"
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
