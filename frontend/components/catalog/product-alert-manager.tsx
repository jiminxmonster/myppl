"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { PageNavigator } from "@/components/layout/page-navigator";
import {
  CatalogCategory,
  NotificationPreference,
  ProductAlertSubscription,
  createProductAlertSubscription,
  deleteProductAlertSubscription,
  getCatalogCategories,
  getNotificationPreference,
  getProductAlertSubscriptions,
  updateNotificationPreference,
  updateProductAlertSubscription,
} from "@/lib/api";

const channelOptions = [
  { value: "in_app", label: "내부 알림" },
  { value: "email", label: "이메일" },
  { value: "kakao", label: "카카오톡" },
  { value: "sms", label: "문자" },
];

const eventOptions = [
  { value: "new_product", label: "신규 상품" },
  { value: "price_drop", label: "가격 하락" },
  { value: "restock", label: "재입고" },
];

type ProductAlertManagerProps = {
  title: string;
  description: string;
  breadcrumbItems?: { label: string; href?: string }[];
  initialSubscriptionId?: number;
  showChannelPreferencePanel?: boolean;
};

type AlertFormState = {
  category: number;
  name: string;
  keywords: string;
  channels: string[];
  notify_events: string[];
  filters: Record<string, unknown>;
};

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

function pickStoredFilters(filters: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(filters).filter(([key]) => !key.startsWith("__")));
}

function prettifyFilterKey(key: string) {
  return key.replace(/[-_]+/g, " ").trim();
}

function summarizeFilters(filters: Record<string, unknown>) {
  const rawLabels = filters.__filter_labels;
  const filterLabels =
    rawLabels && typeof rawLabels === "object" && !Array.isArray(rawLabels)
      ? (rawLabels as Record<string, string>)
      : {};

  return Object.entries(filters)
    .filter(([key, value]) => !key.startsWith("__") && value !== "" && value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0))
    .map(([key, value]) => ({
      label: filterLabels[key] ?? prettifyFilterKey(key),
      value: Array.isArray(value) ? value.join(", ") : `${value}`,
    }));
}

function extractChecklistCategoryId(filters: Record<string, unknown>, fallbackCategory: number) {
  const rawCategory = filters.__checklist_category;
  if (rawCategory && typeof rawCategory === "object" && "id" in rawCategory) {
    const categoryId = Number((rawCategory as { id?: unknown }).id);
    if (categoryId) {
      return categoryId;
    }
  }

  return fallbackCategory;
}

function createDefaultForm(): AlertFormState {
  return {
    category: 0,
    name: "",
    keywords: "",
    channels: ["in_app"],
    notify_events: ["new_product", "price_drop"],
    filters: {},
  };
}

export function ProductAlertManager({
  title,
  description,
  breadcrumbItems,
  initialSubscriptionId,
  showChannelPreferencePanel = false,
}: ProductAlertManagerProps) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subscriptions, setSubscriptions] = useState<ProductAlertSubscription[]>([]);
  const [preference, setPreference] = useState<NotificationPreference | null>(null);
  const [form, setForm] = useState<AlertFormState>(createDefaultForm());
  const [activeChecklistCategoryId, setActiveChecklistCategoryId] = useState(0);
  const [editInitialized, setEditInitialized] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCatalogCategory = categoryMap.get(Number(form.category)) ?? null;

  const checklistTabs = useMemo(() => {
    if (!selectedCatalogCategory) {
      return [];
    }

    if (selectedCatalogCategory.parent) {
      const parentCategory = categoryMap.get(selectedCatalogCategory.parent);
      return (
        parentCategory?.child_categories
          .map((child) => categoryMap.get(child.id))
          .filter((item): item is CatalogCategory => Boolean(item)) ?? []
      );
    }

    if (selectedCatalogCategory.child_categories.length > 0) {
      return selectedCatalogCategory.child_categories
        .map((child) => categoryMap.get(child.id))
        .filter((item): item is CatalogCategory => Boolean(item));
    }

    return [];
  }, [categoryMap, selectedCatalogCategory]);

  const activeChecklistCategory =
    categoryMap.get(activeChecklistCategoryId) ?? selectedCatalogCategory;

  useEffect(() => {
    void loadData();
  }, []);

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
        const isValid = selectedCatalogCategory.child_categories.some((child) => child.id === current);
        return isValid ? current : selectedCatalogCategory.child_categories[0].id;
      });
      return;
    }

    setActiveChecklistCategoryId(selectedCatalogCategory.id);
  }, [selectedCatalogCategory]);

  useEffect(() => {
    if (!initialSubscriptionId || editInitialized) {
      return;
    }

    const target = subscriptions.find((item) => item.id === initialSubscriptionId);
    if (!target) {
      return;
    }

    setForm({
      category: target.category,
      name: target.name,
      keywords: target.keywords.join(", "),
      channels: target.channels.map((channel) => channel.channel),
      notify_events: target.notify_events,
      filters: pickStoredFilters(target.filters),
    });
    setActiveChecklistCategoryId(extractChecklistCategoryId(target.filters, target.category));
    setEditInitialized(true);
  }, [editInitialized, initialSubscriptionId, subscriptions]);

  async function loadData() {
    try {
      const [categoryItems, subscriptionItems] = await Promise.all([
        getCatalogCategories(),
        getProductAlertSubscriptions(),
      ]);
      setCategories(categoryItems);
      setSubscriptions(subscriptionItems);
      if (showChannelPreferencePanel) {
        const preferenceItem = await getNotificationPreference();
        setPreference(preferenceItem);
      } else {
        setPreference(null);
      }
      setForm((current) => ({
        ...current,
        category: current.category || categoryItems[0]?.id || 0,
      }));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "알림 설정을 불러오지 못했습니다.");
    }
  }

  function updateFilterValue(filterSlug: string, value: unknown) {
    setForm((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [filterSlug]: value,
      },
    }));
  }

  function toggleArrayValue(field: "channels" | "notify_events", value: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const finalCategoryId = activeChecklistCategory?.id ?? form.category;
      if (!finalCategoryId) {
        throw new Error("카테고리를 먼저 선택해주세요.");
      }

      const filterLabels =
        activeChecklistCategory?.filters.reduce<Record<string, string>>((result, filterItem) => {
          result[filterItem.slug] = filterItem.name;
          return result;
        }, {}) ?? {};

      const finalFilters: Record<string, unknown> = { ...form.filters };
      if (Object.keys(filterLabels).length > 0) {
        finalFilters.__filter_labels = filterLabels;
      }
      if (activeChecklistCategory) {
        finalFilters.__checklist_category = {
          id: activeChecklistCategory.id,
          name: activeChecklistCategory.name,
          slug: activeChecklistCategory.slug,
        };
      }

      const payload = {
        category: finalCategoryId,
        name: form.name,
        filters: finalFilters,
        keywords: form.keywords.split(",").map((item) => item.trim()).filter(Boolean),
        channels: form.channels,
        notify_events: form.notify_events,
        is_active: true,
      };

      const saved = initialSubscriptionId
        ? await updateProductAlertSubscription(initialSubscriptionId, payload)
        : await createProductAlertSubscription(payload);

      setSubscriptions((current) =>
        initialSubscriptionId
          ? current.map((item) => (item.id === initialSubscriptionId ? saved : item))
          : [saved, ...current]
      );

      if (!initialSubscriptionId) {
        setForm((current) => ({
          ...createDefaultForm(),
          category: current.category,
        }));
      }

      setNotice(initialSubscriptionId ? "원하는상품 조건을 수정했습니다." : "관심조건을 저장했습니다.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "관심조건 저장에 실패했습니다.");
    }
  }

  async function handlePreferenceChange(patch: Partial<NotificationPreference>) {
    try {
      const updated = await updateNotificationPreference(patch);
      setPreference(updated);
      setNotice("알림 채널 설정을 저장했습니다.");
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "알림 설정 저장에 실패했습니다.");
    }
  }

  async function handleDelete(subscriptionId: number) {
    await deleteProductAlertSubscription(subscriptionId);
    setSubscriptions((current) => current.filter((item) => item.id !== subscriptionId));
  }

  return (
    <section className="space-y-6">
      {breadcrumbItems?.length ? <PageNavigator items={breadcrumbItems} /> : null}
      <div className="border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{description}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4 border border-[var(--border)] bg-white p-6 shadow-soft" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">상품 카테고리</label>
              <select
                className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: Number(event.target.value), filters: {} }))
                }
              >
                <option value={0}>카테고리 선택</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">조건 이름</label>
              <input
                className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
                placeholder="예: 출퇴근용 경량 노트북"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
          </div>

          {checklistTabs.length > 0 ? (
            <section className="space-y-4 border border-[var(--border)] bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">세부 주제 선택</h2>
                <p className="mt-1 text-sm text-slate-500">찾고 싶은 품목을 먼저 고르면 아래 상세 옵션이 그 기준으로 바뀝니다.</p>
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
                <h2 className="text-lg font-semibold text-[var(--ink)]">원하는 상세 옵션</h2>
                <p className="mt-1 text-sm text-slate-500">운영자가 정의한 체크리스트를 기준으로 원하는 사양을 선택해 저장합니다.</p>
              </div>
              <div className="space-y-0 overflow-hidden border border-[var(--border)] bg-white">
                {activeChecklistCategory.filters
                  .filter((filterItem) => filterItem.is_visible)
                  .map((filterItem) => (
                    <div
                      key={filterItem.id}
                      className="grid border-b border-[var(--border)] last:border-b-0 md:grid-cols-[180px_1fr]"
                    >
                      <div className="border-r border-[var(--border)] bg-slate-50 px-4 py-4">
                        <p className="font-semibold text-[var(--ink)]">{filterItem.name}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {filterItem.source_mode === "imported"
                            ? "자동"
                            : filterItem.source_mode === "hybrid"
                              ? "혼합"
                              : "수동"}
                        </p>
                      </div>
                      <div className="px-4 py-4">
                        {filterItem.filter_type === "checkbox" ? (
                          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                            {filterItem.options.map((option) => {
                              const currentValues = Array.isArray(form.filters[filterItem.slug])
                                ? (form.filters[filterItem.slug] as string[])
                                : [];
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
                            value={
                              typeof form.filters[filterItem.slug] === "string"
                                ? String(form.filters[filterItem.slug])
                                : ""
                            }
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
                            value={
                              typeof form.filters[filterItem.slug] === "string"
                                ? String(form.filters[filterItem.slug])
                                : ""
                            }
                            onChange={(event) => updateFilterValue(filterItem.slug, event.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          {activeChecklistCategory?.reference_images.length ? (
            <section className="space-y-3 border border-[var(--border)] bg-white p-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink)]">참고 이미지</h2>
                <p className="mt-1 text-sm text-slate-500">운영자가 미리 넣어둔 대표 예시 이미지를 보고 원하는 상품 조건을 더 정확하게 고를 수 있습니다.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {activeChecklistCategory.reference_images
                  .filter((image) => image.is_active)
                  .map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-[5px] border border-[var(--border)] bg-white">
                      <div className="aspect-[4/3] bg-[var(--muted)]/20">
                        <img src={image.image} alt={image.title} className="h-full w-full object-contain" />
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-[var(--ink)]">{image.title}</p>
                        {image.description ? <p className="mt-1 text-xs text-slate-500">{image.description}</p> : null}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">추가 키워드</label>
              <input
                className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
                placeholder="예: 화이트, 방수, 저소음 / 쉼표로 구분"
                value={form.keywords}
                onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-semibold">알림 이벤트</p>
              <div className="flex flex-wrap gap-3">
                {eventOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.notify_events.includes(option.value)}
                      onChange={() => toggleArrayValue("notify_events", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-semibold">수신 채널</p>
              <div className="flex flex-wrap gap-3">
                {channelOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.channels.includes(option.value)}
                      onChange={() => toggleArrayValue("channels", option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}
          <button className="rounded-[5px] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white">
            {initialSubscriptionId ? "원하는상품 수정" : "등록 알림 설정"}
          </button>
        </form>

        <div className="space-y-6">
          {showChannelPreferencePanel ? (
          <section className="border border-[var(--border)] bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold">알림 채널 옵션</h2>
            {preference ? (
              <div className="mt-4 space-y-3">
                <label className="flex items-center justify-between rounded-[5px] border border-[var(--border)] px-4 py-3">
                  <span>내부 알림</span>
                  <input
                    type="checkbox"
                    checked={preference.allow_in_app}
                    onChange={(event) => void handlePreferenceChange({ allow_in_app: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-[5px] border border-[var(--border)] px-4 py-3">
                  <span>이메일 받기</span>
                  <input
                    type="checkbox"
                    checked={preference.allow_email}
                    onChange={(event) => void handlePreferenceChange({ allow_email: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-[5px] border border-[var(--border)] px-4 py-3">
                  <span>카카오 알림</span>
                  <input
                    type="checkbox"
                    checked={preference.allow_kakao}
                    onChange={(event) => void handlePreferenceChange({ allow_kakao: event.target.checked })}
                  />
                </label>
                <label className="flex items-center justify-between rounded-[5px] border border-[var(--border)] px-4 py-3">
                  <span>문자 받기</span>
                  <input
                    type="checkbox"
                    checked={preference.allow_sms}
                    onChange={(event) => void handlePreferenceChange({ allow_sms: event.target.checked })}
                  />
                </label>
                <input
                  className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
                  placeholder="수신 이메일"
                  value={preference.email}
                  onChange={(event) =>
                    setPreference((current) => (current ? { ...current, email: event.target.value } : current))
                  }
                  onBlur={() => void handlePreferenceChange({ email: preference.email })}
                />
                <input
                  className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
                  placeholder="전화번호"
                  value={preference.phone_number}
                  onChange={(event) =>
                    setPreference((current) => (current ? { ...current, phone_number: event.target.value } : current))
                  }
                  onBlur={() => void handlePreferenceChange({ phone_number: preference.phone_number })}
                />
                <input
                  className="w-full rounded-[5px] border border-[var(--border)] px-4 py-3"
                  placeholder="카카오 식별값"
                  value={preference.kakao_target}
                  onChange={(event) =>
                    setPreference((current) => (current ? { ...current, kakao_target: event.target.value } : current))
                  }
                  onBlur={() => void handlePreferenceChange({ kakao_target: preference.kakao_target })}
                />
              </div>
            ) : null}
          </section>
          ) : null}

          <section className="border border-[var(--border)] bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">저장된 원하는상품</h2>
              <Link href="/wanted-products" className="text-sm font-semibold text-[var(--brand)]">
                전체 보기
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {subscriptions.map((item) => {
                const filterSummary = summarizeFilters(item.filters);
                return (
                  <article key={item.id} className="rounded-[5px] border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.category_name}</p>
                        </div>
                        {filterSummary.length ? (
                          <div className="flex flex-wrap gap-2">
                            {filterSummary.slice(0, 4).map((summary) => (
                              <span
                                key={`${item.id}-${summary.label}`}
                                className="rounded-[5px] bg-slate-100 px-2 py-1 text-xs text-slate-600"
                              >
                                {summary.label}: {summary.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          이벤트: {item.notify_events.join(", ") || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          채널: {item.channels.map((channel) => channel.channel).join(", ") || "-"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/wanted-products/${item.id}/edit`}
                          className="rounded-[5px] border border-[var(--border)] px-3 py-2 text-center text-sm font-semibold text-slate-700"
                        >
                          수정
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          className="rounded-[5px] border border-red-200 px-3 py-2 text-sm font-semibold text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
