"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getStoredTokens } from "@/lib/auth";
import {
  AdminExternalProvider,
  AdminMenuCategory,
  CatalogCategory,
  MarketplaceItem,
  createMarketplaceItem,
  previewSellerImport,
  updateMarketplaceItem,
} from "@/lib/api";

type MarketplaceSellFormProps = {
  categories: AdminMenuCategory[];
  catalogCategories: CatalogCategory[];
  providers: AdminExternalProvider[];
  selectedCategorySlug?: string;
  initialItem?: MarketplaceItem | null;
};

type SellMode = "manual" | "imported";

function pickTemplateSnapshot(snapshot: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(snapshot).filter(([key]) => !key.startsWith("__")));
}

function prettifyFilterKey(key: string) {
  return key.replace(/[-_]+/g, " ").trim();
}

function categoryLooksUsed(name?: string) {
  const normalized = `${name ?? ""}`.toLowerCase();
  return normalized.includes("중고") || normalized.includes("used") || normalized.includes("리퍼");
}

function getEffectiveMenuPlacement(placement?: string): "sale" | "used" | "both" | "hidden" {
  if (placement === "sale" || placement === "used" || placement === "both" || placement === "hidden") {
    return placement;
  }
  return "both";
}

function canUseCategoryPlacement(
  placement: "sale" | "used" | "both" | "hidden" | undefined,
  marketType: "sale" | "used"
) {
  const resolvedPlacement = getEffectiveMenuPlacement(placement);
  if (resolvedPlacement === "hidden") {
    return false;
  }
  return resolvedPlacement === "both" || resolvedPlacement === marketType;
}

function flattenCategories(categories: CatalogCategory[]) {
  return categories.flatMap((category) => [
    { id: category.id, name: category.name, depth: 0 },
    ...category.child_categories.map((child) => ({
      id: child.id,
      name: `${category.name} / ${child.name}`,
      depth: 1,
    })),
  ]);
}

export function MarketplaceSellForm({
  categories,
  catalogCategories,
  providers,
  selectedCategorySlug,
  initialItem,
}: MarketplaceSellFormProps) {
  const router = useRouter();
  const visibleCatalogCategories = useMemo(
    () => catalogCategories.filter((item) => item.is_visible),
    [catalogCategories]
  );
  const catalogCategoryOptions = useMemo(() => flattenCategories(visibleCatalogCategories), [visibleCatalogCategories]);
  const catalogCategoryMap = useMemo(
    () => new Map(catalogCategories.map((category) => [category.id, category])),
    [catalogCategories]
  );
  const [mode, setMode] = useState<SellMode>((initialItem?.source_mode as SellMode | undefined) ?? "manual");
  const [marketType, setMarketType] = useState<"sale" | "used">(() => {
    if (initialItem?.menu_placement === "sale" || initialItem?.menu_placement === "used") {
      return initialItem.menu_placement;
    }
    if (initialItem?.is_negotiable) {
      return "used";
    }
    if (initialItem?.category_name && categoryLooksUsed(initialItem.category_name)) {
      return "used";
    }
    return "sale";
  });
  const [form, setForm] = useState({
    category: initialItem?.category ?? categories.find((item) => item.slug === selectedCategorySlug)?.id ?? 0,
    product_category: initialItem?.product_category ?? 0,
    title: initialItem?.title ?? "",
    description: initialItem?.description ?? "",
    original_price: initialItem?.original_price ?? "",
    price: initialItem?.price ?? "",
    region: initialItem?.region ?? "",
    is_negotiable: initialItem?.is_negotiable ?? false,
    external_provider: initialItem?.external_provider ?? 0,
    external_reference: initialItem?.external_reference ?? "",
    external_image_url: initialItem?.external_image_url ?? "",
  });
  const [rawPayload, setRawPayload] = useState(
    initialItem?.external_payload ? JSON.stringify(initialItem.external_payload, null, 2) : ""
  );
  const [optionSnapshot, setOptionSnapshot] = useState<Record<string, unknown>>(
    pickTemplateSnapshot(initialItem?.option_snapshot ?? {})
  );
  const [externalPayload, setExternalPayload] = useState<Record<string, unknown>>(initialItem?.external_payload ?? {});
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");

  const selectedCatalogCategory = catalogCategoryMap.get(Number(form.product_category)) ?? null;
  const filteredCategories = useMemo(() => {
    const base = categories.filter((category) => canUseCategoryPlacement(category.menu_placement, marketType));
    if (base.length > 0) {
      return base;
    }
    return categories.filter((category) => category.menu_placement !== "hidden");
  }, [categories, marketType]);
  const [activeChecklistCategoryId, setActiveChecklistCategoryId] = useState<number>(() => {
    const selectedMeta = initialItem?.option_snapshot?.__checklist_category;
    if (selectedMeta && typeof selectedMeta === "object" && "id" in selectedMeta) {
      return Number((selectedMeta as { id?: unknown }).id) || 0;
    }
    return Number(form.product_category) || 0;
  });

  const checklistTabs = useMemo(() => {
    if (!selectedCatalogCategory) {
      return [];
    }

    if (selectedCatalogCategory.parent) {
      const parentCategory = catalogCategoryMap.get(selectedCatalogCategory.parent);
      return parentCategory?.child_categories
        .map((child) => catalogCategoryMap.get(child.id))
        .filter((item): item is CatalogCategory => Boolean(item)) ?? [];
    }

    if (selectedCatalogCategory.child_categories.length > 0) {
      return selectedCatalogCategory.child_categories
        .map((child) => catalogCategoryMap.get(child.id))
        .filter((item): item is CatalogCategory => Boolean(item));
    }

    return [];
  }, [catalogCategoryMap, selectedCatalogCategory]);

  const activeChecklistCategory =
    catalogCategoryMap.get(activeChecklistCategoryId) ??
    selectedCatalogCategory;

  useEffect(() => {
    if (!selectedCatalogCategory) {
      setActiveChecklistCategoryId(0);
      return;
    }

    if (selectedCatalogCategory.parent) {
      setActiveChecklistCategoryId(selectedCatalogCategory.id);
      return;
    }

    if (selectedCatalogCategory.child_categories.length > 0) {
      setActiveChecklistCategoryId((current) => {
        const isCurrentValid = selectedCatalogCategory.child_categories.some((child) => child.id === current);
        return isCurrentValid ? current : selectedCatalogCategory.child_categories[0].id;
      });
      return;
    }

    setActiveChecklistCategoryId(selectedCatalogCategory.id);
  }, [selectedCatalogCategory]);

  useEffect(() => {
    if (marketType === "sale" && form.is_negotiable) {
      setForm((current) => ({ ...current, is_negotiable: false }));
    }
  }, [form.is_negotiable, marketType]);

  useEffect(() => {
    if (!form.category) {
      return;
    }
    const exists = filteredCategories.some((category) => category.id === form.category);
    if (!exists) {
      setForm((current) => ({ ...current, category: filteredCategories[0]?.id ?? 0 }));
    }
  }, [filteredCategories, form.category]);

  function buildOptionSnapshotPayload() {
    const filterLabels =
      activeChecklistCategory?.filters.reduce<Record<string, string>>((result, filterItem) => {
        result[filterItem.slug] = filterItem.name;
        return result;
      }, {}) ?? {};
    const finalOptionSnapshot: Record<string, unknown> = {
      ...optionSnapshot,
    };

    if (Object.keys(filterLabels).length > 0) {
      finalOptionSnapshot.__filter_labels = filterLabels;
    }

    if (activeChecklistCategory) {
      finalOptionSnapshot.__checklist_category = {
        id: activeChecklistCategory.id,
        name: activeChecklistCategory.name,
        slug: activeChecklistCategory.slug,
      };
    }

    return finalOptionSnapshot;
  }

  function updateFilterValue(filterSlug: string, value: unknown) {
    setOptionSnapshot((current) => ({ ...current, [filterSlug]: value }));
  }

  async function handlePreviewImport() {
    setError("");
    setPreviewMessage("");
    setPreviewLoading(true);

    try {
      const preview = await previewSellerImport({
        provider: form.external_provider || null,
        product_category: form.product_category || null,
        external_reference: form.external_reference,
        raw_payload: rawPayload,
      });

      setMode("imported");
      setForm((current) => ({
        ...current,
        title: preview.title || current.title,
        description: preview.description || current.description,
        price: preview.price || current.price,
        region: preview.region || current.region || "전국",
        product_category: preview.product_category?.id ?? current.product_category,
        external_provider: preview.provider?.id ?? current.external_provider,
        external_reference: preview.external_reference || current.external_reference,
        external_image_url: preview.external_image_url || current.external_image_url,
      }));
      setOptionSnapshot(pickTemplateSnapshot(preview.option_snapshot ?? {}));
      setExternalPayload(preview.external_payload ?? {});
      setRawPayload(
        Object.keys(preview.external_payload ?? {}).length
          ? JSON.stringify(preview.external_payload, null, 2)
          : rawPayload
      );
      setPreviewMessage("외부 상품 정보를 불러왔습니다. 내용을 검토한 뒤 저장하면 됩니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "외부 상품 정보를 불러오지 못했습니다.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      setError("로그인 후 판매 상품을 등록할 수 있습니다.");
      setLoading(false);
      return;
    }

    try {
      const finalOptionSnapshot = buildOptionSnapshotPayload();

      const payload = {
        category: form.category || null,
        product_category: (activeChecklistCategory?.id ?? form.product_category) || null,
        title: form.title,
        description: form.description,
        original_price: form.original_price,
        price: form.price,
        region: form.region,
        menu_placement: marketType,
        is_negotiable: form.is_negotiable,
        source_mode: mode,
        external_provider: mode === "imported" ? form.external_provider || null : null,
        external_reference: mode === "imported" ? form.external_reference : "",
        external_image_url: mode === "imported" ? form.external_image_url : "",
        external_payload: mode === "imported" ? externalPayload : {},
        option_snapshot: finalOptionSnapshot,
        image,
      };

      const saved = initialItem
        ? await updateMarketplaceItem(initialItem.id, payload)
        : await createMarketplaceItem(payload);

      router.push("/seller-products");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "판매 상품 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-6 border border-[var(--border)] bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`rounded-[5px] px-4 py-2 text-sm font-semibold ${
            mode === "manual" ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] text-slate-700"
          }`}
        >
          수동 등록
        </button>
        <button
          type="button"
          onClick={() => setMode("imported")}
          className={`rounded-[5px] px-4 py-2 text-sm font-semibold ${
            mode === "imported" ? "bg-[var(--brand)] text-white" : "border border-[var(--border)] text-slate-700"
          }`}
        >
          외부 상품 불러오기
        </button>
      </div>

      {mode === "imported" ? (
        <section className="grid gap-4 border border-[var(--border)] bg-[var(--muted)]/20 p-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">외부 제공자</label>
            <select
              className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
              value={form.external_provider}
              onChange={(event) => setForm((current) => ({ ...current, external_provider: Number(event.target.value) }))}
            >
              <option value={0}>제공자 선택</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} · {provider.provider_type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">상품 코드 또는 URL</label>
            <input
              className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
              placeholder="예: 쿠팡 상품코드 또는 상품 URL"
              value={form.external_reference}
              onChange={(event) => setForm((current) => ({ ...current, external_reference: event.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">원본 API JSON 또는 피드 샘플</label>
            <textarea
              className="min-h-[180px] w-full rounded-[5px] border border-[var(--border)] px-4 py-3 font-mono text-sm"
              placeholder='{"title":"상품명","price":"120000","description":"외부 API 응답"}'
              value={rawPayload}
              onChange={(event) => setRawPayload(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => void handlePreviewImport()}
              disabled={previewLoading}
              className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {previewLoading ? "불러오는 중..." : "상품 정보 불러오기"}
            </button>
            {previewMessage ? <p className="mt-3 text-sm text-emerald-700">{previewMessage}</p> : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">장터 분류</label>
          <select
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            value={marketType}
            onChange={(event) => setMarketType(event.target.value as "sale" | "used")}
          >
            <option value="sale">상품판매</option>
            <option value="used">중고상품</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">세부 카테고리</label>
          <select
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: Number(event.target.value) }))}
          >
            <option value={0}>카테고리 선택</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">운영자 체크리스트 템플릿</label>
          <select
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            value={form.product_category}
            onChange={(event) => setForm((current) => ({ ...current, product_category: Number(event.target.value) }))}
          >
            <option value={0}>상품 상세 카테고리 선택</option>
            {catalogCategoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">상품 제목</label>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            placeholder="판매 상품 제목"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">원래가격</label>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            placeholder="취소선으로 표시할 가격"
            value={form.original_price}
            onChange={(event) => setForm((current) => ({ ...current, original_price: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">현재가격</label>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            placeholder="현재 판매 가격"
            value={form.price}
            onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">지역</label>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            placeholder="예: 서울 강남 / 전국"
            value={form.region}
            onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
          />
        </div>
        {marketType === "used" ? (
          <label className="flex items-center gap-3 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.is_negotiable}
              onChange={(event) => setForm((current) => ({ ...current, is_negotiable: event.target.checked }))}
            />
            가격 흥정 가능
          </label>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">대표 이미지 업로드</label>
          <input
            className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            type="file"
            accept="image/*"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
          />
          {mode === "imported" && form.external_image_url ? (
            <p className="text-xs text-slate-500">외부 이미지 URL이 함께 저장됩니다. 로컬 이미지를 올리면 그 이미지가 우선합니다.</p>
          ) : null}
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-semibold text-slate-700">상품 설명</label>
          <textarea
            className="min-h-[160px] w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
            placeholder="상품 상태, 특이사항, 거래 방식 등을 적어주세요."
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
      </div>

      {checklistTabs.length > 0 ? (
        <section className="space-y-4 border border-[var(--border)] bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">세부 주제 선택</h2>
            <p className="mt-1 text-sm text-slate-500">판매할 상품의 세부 품목을 먼저 고르면 아래 상세 옵션이 그 기준으로 바뀝니다.</p>
          </div>
          <div className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
            {checklistTabs.map((tab) => {
              const isActive = tab.id === activeChecklistCategory?.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveChecklistCategoryId(tab.id)}
                  className={`px-4 py-4 text-center text-sm font-semibold transition ${
                    isActive ? "bg-slate-100 text-[var(--brand)]" : "bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeChecklistCategory?.filters.length ? (
        <section className="space-y-4 border border-[var(--border)] bg-[var(--muted)]/20 p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">세부 체크리스트</h2>
            <p className="mt-1 text-sm text-slate-500">운영자가 미리 만든 옵션을 그대로 선택하거나, 외부 연동 값으로 미리 채워진 내용을 수정할 수 있습니다.</p>
          </div>
          <div className="space-y-0 overflow-hidden border border-[var(--border)] bg-white">
            {activeChecklistCategory.filters
              .filter((filterItem) => filterItem.is_visible)
              .map((filterItem) => (
                <div key={filterItem.id} className="grid border-b border-[var(--border)] last:border-b-0 md:grid-cols-[180px_1fr]">
                  <div className="border-r border-[var(--border)] bg-slate-50 px-4 py-4">
                    <p className="font-semibold text-[var(--ink)]">{filterItem.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {filterItem.source_mode === "imported" ? "자동" : filterItem.source_mode === "hybrid" ? "혼합" : "수동"}
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    {filterItem.filter_type === "checkbox" ? (
                      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                      {filterItem.options.map((option) => {
                        const currentValues = Array.isArray(optionSnapshot[filterItem.slug]) ? (optionSnapshot[filterItem.slug] as string[]) : [];
                        const checked = currentValues.includes(option.label);
                        return (
                          <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const nextValues = event.target.checked
                                  ? [...currentValues, option.label]
                                  : currentValues.filter((value) => value !== option.label);
                                updateFilterValue(filterItem.slug, nextValues);
                              }}
                            />
                            {option.color_code ? (
                              <span
                                className="inline-block h-3 w-3 rounded-full border border-slate-200"
                                style={{ backgroundColor: option.color_code }}
                              />
                            ) : null}
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                      </div>
                    ) : filterItem.filter_type === "single" ? (
                      <select
                        className="w-full rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm"
                        value={typeof optionSnapshot[filterItem.slug] === "string" ? String(optionSnapshot[filterItem.slug]) : ""}
                        onChange={(event) => updateFilterValue(filterItem.slug, event.target.value)}
                      >
                        <option value="">선택 안 함</option>
                        {filterItem.options.map((option) => (
                          <option key={option.id} value={option.label}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="w-full rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm"
                        placeholder={`${filterItem.name} 입력`}
                        value={typeof optionSnapshot[filterItem.slug] === "string" ? String(optionSnapshot[filterItem.slug]) : ""}
                        onChange={(event) => updateFilterValue(filterItem.slug, event.target.value)}
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-[5px] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "저장 중..." : initialItem ? "판매 상품 수정" : "판매 상품 등록"}
      </button>
    </form>
  );
}
