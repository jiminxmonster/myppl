import Link from "next/link";

import { SafeImage } from "@/components/common/safe-image";
import { PageNavigator } from "@/components/layout/page-navigator";
import { SideCategoryMenu } from "@/components/layout/side-category-menu";
import { getHotdealCategories, getHotdealDetail, getProductPlaceholder, resolveMediaUrl } from "@/lib/api";

type HotdealDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function HotdealDetailPage({ params }: HotdealDetailPageProps) {
  const { id } = await params;
  const [hotdeal, categories] = await Promise.all([
    getHotdealDetail(id).catch(() => null),
    getHotdealCategories().catch(() => []),
  ]);

  if (!hotdeal) {
    return <div className="rounded-[0.67rem] bg-white p-8 shadow-soft">핫딜을 불러오지 못했습니다.</div>;
  }

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "핫딜", href: "/hotdeals" },
          ...(hotdeal.category_slug
            ? [{ label: hotdeal.category_name, href: `/hotdeals?category=${encodeURIComponent(hotdeal.category_slug)}` }]
            : []),
          { label: hotdeal.title },
        ]}
      />
      <div className="grid items-start gap-3 grid-cols-[minmax(0,1fr)_92px] xl:gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="space-y-6 rounded-[0.67rem] border border-[var(--border)] bg-white p-4 shadow-soft sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">{hotdeal.status}</p>
            <h1 className="mt-3 text-3xl font-bold">{hotdeal.title}</h1>
            <p className="mt-3 text-sm text-slate-600">{hotdeal.author_nickname} · {new Date(hotdeal.created_at).toLocaleString("ko-KR")}</p>
          </div>
          <div className="mt-6 flex h-80 w-full items-center justify-center rounded-[5px] border border-[var(--border)] bg-[var(--muted)] p-4">
            <SafeImage
              src={hotdeal.image ? resolveMediaUrl(hotdeal.image) : getProductPlaceholder("hotdeal", hotdeal.category_name)}
              alt={`${hotdeal.title} 대표 이미지`}
              className="h-full w-full object-contain"
              seed={`hotdeal-detail-${hotdeal.id}-${hotdeal.title}`}
            />
          </div>
          <p className="mt-6 text-base leading-7 text-slate-700">{hotdeal.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2">정가 {Number(hotdeal.original_price).toLocaleString()}원</span>
            <span className="rounded-[5px] bg-[var(--muted)] px-4 py-2">판매가 {Number(hotdeal.sale_price).toLocaleString()}원</span>
            <span className="rounded-[5px] bg-[var(--brand)] px-4 py-2 text-white">할인율 {hotdeal.discount_rate}%</span>
          </div>
          <Link href={hotdeal.source_url} className="mt-8 inline-block rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
            구매 링크 이동
          </Link>
        </article>
        <SideCategoryMenu
          title="핫딜 카테고리"
          description="핫딜은 상품군별로 묶어서 빠르게 훑어볼 수 있게 정리합니다."
          basePath="/hotdeals"
          categories={categories}
          selectedCategorySlug={hotdeal.category_slug ?? null}
        />
      </div>
    </section>
  );
}
