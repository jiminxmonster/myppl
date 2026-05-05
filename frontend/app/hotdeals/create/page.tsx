import { PageNavigator } from "@/components/layout/page-navigator";
import { HotdealCreateForm } from "@/components/hotdeal/hotdeal-create-form";
import { getHotdealCategories } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HotdealCreatePage() {
  const categories = await getHotdealCategories().catch(() => []);

  return (
    <section className="space-y-6">
      <PageNavigator
        items={[
          { label: "홈", href: "/" },
          { label: "핫딜", href: "/hotdeals" },
          { label: "핫딜 등록" },
        ]}
      />
      <div className="border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">핫딜 등록</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          운영자 전용 등록 화면입니다. 상품명, 가격, 링크, 만료 시각, 이미지를 입력해 핫딜 목록에 노출합니다.
        </p>
      </div>
      <HotdealCreateForm categories={categories} />
    </section>
  );
}
