import Link from "next/link";
import { notFound } from "next/navigation";

import { getCatalogCategories, resolveMediaUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CatalogCategoryDetailPage({ params }: { params: { slug: string } }) {
  const categories = await getCatalogCategories().catch(() => []);
  const decodedSlug = decodeURIComponent(params.slug);
  const category = categories.find((item) => item.slug === decodedSlug);

  if (!category) {
    notFound();
  }

  const siblingTabs = category.parent
    ? categories.filter((item) => item.parent === category.parent)
    : categories.filter((item) => item.parent === category.id);
  const displayTabs = siblingTabs.length > 0 ? siblingTabs : [category];

  return (
    <section className="space-y-8">
      <div className="border border-[var(--border)] bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[var(--brand)]">Category</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
          {category.description || "원하는 상품군과 세부 조건을 체크한 뒤 관심조건으로 저장하고, 이후 신규 상품이나 가격 하락 정보를 빠르게 받을 수 있습니다."}
        </p>
      </div>

      <div className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
        {displayTabs.map((item) => {
          const isCurrent = item.id === category.id;
          return (
            <Link
              key={item.id}
              href={`/catalog/categories/${item.slug}`}
              className={`px-4 py-4 text-center text-sm font-semibold transition ${
                isCurrent ? "bg-slate-100 text-[var(--brand)]" : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="border border-[var(--border)] bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-black tracking-tight">상세검색</h2>
          <p className="text-sm text-slate-500">가장 많이 선택한 옵션은 이후 자동 수집과 매칭될 수 있도록 운영자가 정규화해 관리합니다.</p>
        </div>
        <div className="mt-6">
          {category.filters.length > 0 ? (
            category.filters.map((filter) => (
              <div key={filter.id} className="grid gap-3 border-b border-[var(--border)] py-4 md:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-base font-semibold text-[var(--ink)]">{filter.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {filter.source_mode === "manual" ? "수동 입력" : filter.source_mode === "imported" ? "자동 수집" : "수동 + 자동"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {filter.options.length > 0 ? (
                    filter.options.map((option) => (
                      <label key={option.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" className="h-4 w-4 border border-[var(--border)]" />
                        {option.color_code ? (
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: option.color_code }}
                          />
                        ) : null}
                        <span>{option.label}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">등록된 항목이 아직 없습니다.</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-sm text-slate-400">이 카테고리에는 아직 필터가 없습니다. 운영자 패널에서 먼저 등록해야 합니다.</p>
          )}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/mypage/alerts" className="bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white">
            관심조건 저장하러 가기
          </Link>
          <Link href="/" className="border border-[var(--border)] px-5 py-3 text-sm font-semibold">
            홈으로 돌아가기
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-4xl font-black tracking-tight">my pick list</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {category.reference_images.length > 0 ? (
            category.reference_images.map((image) => (
              <article key={image.id} className="border border-[var(--border)] bg-white p-4 shadow-soft">
                <div className="flex h-56 items-center justify-center bg-[var(--muted)] p-4">
                  <img src={resolveMediaUrl(image.image)} alt={image.title} className="h-full w-full object-contain" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{image.title}</h3>
                {image.description ? <p className="mt-2 text-sm text-slate-600">{image.description}</p> : null}
              </article>
            ))
          ) : (
            <div className="border border-dashed border-[var(--border)] px-6 py-12 text-sm text-slate-400 md:col-span-3">
              아직 등록된 하단 첨부 이미지가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
