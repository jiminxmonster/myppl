"use client";

import { DragEvent, useEffect, useState } from "react";

import {
  HomeHeroSlide,
  createAdminHomeHeroSlide,
  deleteAdminHomeHeroSlide,
  getAdminHomeHeroSlides,
  reorderAdminHomeHeroSlides,
  resolveMediaUrl,
  updateAdminHomeHeroSlide,
} from "@/lib/api";

const HOME_HERO_TRANSITION_OPTIONS = [
  { value: "next", label: "깔끔 다음 페이지" },
  { value: "slide_lr", label: "슬라이드 좌우" },
  { value: "slide_ud", label: "슬라이드 상하" },
  { value: "fade", label: "페이드아웃 페이드인" },
  { value: "mosaic", label: "모자이크식 슬라이드전환" },
  { value: "zoom", label: "줌 인" },
  { value: "rotate", label: "회전" },
  { value: "flip", label: "플립" },
  { value: "wipe", label: "와이프" },
  { value: "cinema", label: "시네마 슬라이드" },
] as const;

type HeroTransitionStyle = (typeof HOME_HERO_TRANSITION_OPTIONS)[number]["value"];

type HeroSlideEditorItem = {
  client_id: string;
  id: number | null;
  title: string;
  description: string;
  badge: string;
  href: string;
  display_seconds: number;
  transition_style: HeroTransitionStyle;
  sort_order: number;
  is_active: boolean;
  image: string;
  image_file: File | null;
  image_preview_url: string | null;
};

function normalizeHeroHref(rawHref: string): { normalized: string; error: string } {
  const href = rawHref.trim();
  if (!href) return { normalized: "", error: "" };
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/")) {
    return { normalized: href, error: "" };
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
    return { normalized: href, error: "" };
  }
  if (href.includes(" ")) return { normalized: href, error: "연결 URL에는 공백이 들어갈 수 없습니다." };
  if (href.includes(".")) return { normalized: `https://${href}`, error: "" };
  return { normalized: `/${href}`, error: "" };
}

function toHeroSlideEditorItem(slide: HomeHeroSlide): HeroSlideEditorItem {
  return {
    client_id: `hero-${slide.id}`,
    id: slide.id,
    title: slide.title,
    description: slide.description,
    badge: slide.badge || "광고",
    href: slide.href || "",
    display_seconds: slide.display_seconds || 3,
    transition_style: (slide.transition_style || "next") as HeroTransitionStyle,
    sort_order: slide.sort_order,
    is_active: slide.is_active,
    image: slide.image,
    image_file: null,
    image_preview_url: null,
  };
}

function reindexHeroSlideEditors(items: HeroSlideEditorItem[]): HeroSlideEditorItem[] {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

export default function AdminHeroSectionsPage() {
  const [heroSlideEditors, setHeroSlideEditors] = useState<HeroSlideEditorItem[]>([]);
  const [draggingHeroClientId, setDraggingHeroClientId] = useState<string | null>(null);
  const [heroDragOverClientId, setHeroDragOverClientId] = useState<string | null>(null);
  const [isHeroSlideOrderDirty, setIsHeroSlideOrderDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadHomeHeroSlides();
  }, []);

  async function loadHomeHeroSlides() {
    try {
      const fetched = await getAdminHomeHeroSlides();
      const ordered = [...fetched].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      setHeroSlideEditors((current) => {
        current.forEach((item) => {
          if (item.image_preview_url) URL.revokeObjectURL(item.image_preview_url);
        });
        return ordered.map(toHeroSlideEditorItem);
      });
      setIsHeroSlideOrderDirty(false);
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "메인 전면광고 목록을 불러오지 못했습니다.");
    }
  }

  function handleSuccess(message: string) {
    setNotice(message);
    setError("");
  }

  function handleAddHeroSlideEditor() {
    const nextItem: HeroSlideEditorItem = {
      client_id: `new-${Date.now()}`,
      id: null,
      title: "",
      description: "",
      badge: "광고",
      href: "",
      display_seconds: 3,
      transition_style: "next",
      sort_order: heroSlideEditors.length,
      is_active: true,
      image: "",
      image_file: null,
      image_preview_url: null,
    };
    setHeroSlideEditors((current) => reindexHeroSlideEditors([nextItem, ...current]));
    setIsHeroSlideOrderDirty(true);
  }

  function updateHeroSlideEditor(clientId: string, patch: Partial<HeroSlideEditorItem>) {
    setHeroSlideEditors((current) => current.map((item) => (item.client_id === clientId ? { ...item, ...patch } : item)));
  }

  function handleHeroSlideDragStart(event: DragEvent<HTMLElement>, clientId: string) {
    event.dataTransfer.effectAllowed = "move";
    setDraggingHeroClientId(clientId);
  }

  function handleHeroSlideDragOver(event: DragEvent<HTMLElement>, targetClientId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!draggingHeroClientId || draggingHeroClientId === targetClientId) return;
    setHeroSlideEditors((current) => {
      const fromIndex = current.findIndex((item) => item.client_id === draggingHeroClientId);
      const toIndex = current.findIndex((item) => item.client_id === targetClientId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const nextItems = [...current];
      const [moved] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, moved);
      return reindexHeroSlideEditors(nextItems);
    });
    setHeroDragOverClientId(targetClientId);
    setIsHeroSlideOrderDirty(true);
  }

  function handleHeroSlideDragEnd() {
    setDraggingHeroClientId(null);
    setHeroDragOverClientId(null);
  }

  function handleHeroSlideImageSelect(clientId: string, file: File | null) {
    setHeroSlideEditors((current) =>
      current.map((item) => {
        if (item.client_id !== clientId) return item;
        if (item.image_preview_url) URL.revokeObjectURL(item.image_preview_url);
        return {
          ...item,
          image_file: file,
          image_preview_url: file ? URL.createObjectURL(file) : null,
        };
      }),
    );
  }

  async function handleSaveHeroSlideEditor(clientId: string) {
    const item = heroSlideEditors.find((entry) => entry.client_id === clientId);
    if (!item) return;
    if (!item.title.trim()) return setError("히어로광고 내용은 필수입니다.");
    const { normalized, error: hrefError } = normalizeHeroHref(item.href);
    if (hrefError) return setError(hrefError);

    try {
      if (item.id === null) {
        if (!item.image_file) return setError("썸네일 이미지를 등록해야 합니다.");
        await createAdminHomeHeroSlide({
          title: item.title.trim(),
          description: item.description.trim(),
          image: item.image_file,
          badge: item.badge,
          href: normalized,
          display_seconds: item.display_seconds,
          transition_style: item.transition_style,
          sort_order: item.sort_order,
          is_active: item.is_active,
        });
      } else {
        await updateAdminHomeHeroSlide(item.id, {
          title: item.title.trim(),
          description: item.description.trim(),
          badge: item.badge,
          href: normalized,
          display_seconds: item.display_seconds,
          transition_style: item.transition_style,
          sort_order: item.sort_order,
          is_active: item.is_active,
          ...(item.image_file ? { image: item.image_file } : {}),
        });
      }
      await loadHomeHeroSlides();
      handleSuccess("히어로광고를 저장했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "히어로광고 저장에 실패했습니다.");
    }
  }

  async function handleDeleteHeroSlideEditor(clientId: string) {
    const item = heroSlideEditors.find((entry) => entry.client_id === clientId);
    if (!item) return;
    if (item.id === null) {
      if (item.image_preview_url) URL.revokeObjectURL(item.image_preview_url);
      setHeroSlideEditors((current) => reindexHeroSlideEditors(current.filter((entry) => entry.client_id !== clientId)));
      setIsHeroSlideOrderDirty(true);
      return;
    }
    if (!window.confirm(`'${item.title || "히어로광고"}'를 삭제하시겠습니까?`)) return;
    try {
      await deleteAdminHomeHeroSlide(item.id);
      await loadHomeHeroSlides();
      handleSuccess("히어로광고를 삭제했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "히어로광고 삭제에 실패했습니다.");
    }
  }

  async function handleApplyAllHeroSlides() {
    setError("");
    try {
      const orderedEditors = reindexHeroSlideEditors(heroSlideEditors);
      const persistedOrder: number[] = [];
      for (const item of orderedEditors) {
        if (!item.title.trim()) throw new Error("모든 히어로광고의 내용(제목)을 입력해야 합니다.");
        const { normalized, error: hrefError } = normalizeHeroHref(item.href);
        if (hrefError) throw new Error(hrefError);
        if (item.id === null) {
          if (!item.image_file) throw new Error("새 히어로광고는 썸네일 이미지를 등록해야 합니다.");
          const created = await createAdminHomeHeroSlide({
            title: item.title.trim(),
            description: item.description.trim(),
            image: item.image_file,
            badge: item.badge,
            href: normalized,
            display_seconds: item.display_seconds,
            transition_style: item.transition_style,
            sort_order: item.sort_order,
            is_active: item.is_active,
          });
          persistedOrder.push(created.id);
        } else {
          await updateAdminHomeHeroSlide(item.id, {
            title: item.title.trim(),
            description: item.description.trim(),
            badge: item.badge,
            href: normalized,
            display_seconds: item.display_seconds,
            transition_style: item.transition_style,
            sort_order: item.sort_order,
            is_active: item.is_active,
            ...(item.image_file ? { image: item.image_file } : {}),
          });
          persistedOrder.push(item.id);
        }
      }
      if (persistedOrder.length > 0) {
        await reorderAdminHomeHeroSlides(persistedOrder);
      }
      await loadHomeHeroSlides();
      setIsHeroSlideOrderDirty(false);
      handleSuccess("히어로 섹션 설정을 실제 노출 동작에 적용했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "히어로 섹션 적용에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
      {error ? <section className="rounded-[0.67rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</section> : null}
      {notice ? <section className="rounded-[0.67rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</section> : null}

      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">히어로섹션 관리</h2>
            <p className="mt-2 text-sm text-slate-600">히어로 화면전환 방식과 노출 시간을 설정하고, 전체 적용으로 즉시 반영합니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-[5px] border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
              onClick={() => void handleApplyAllHeroSlides()}
            >
              (적용)
            </button>
            <button
              type="button"
              className="rounded-[5px] border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
              onClick={handleAddHeroSlideEditor}
            >
              + 히어로광고 추가
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {heroSlideEditors.map((item) => (
            <article
              key={item.client_id}
              className={`grid gap-4 rounded-[0.67rem] border p-5 transition-all md:grid-cols-[56px_1fr_1.3fr] ${
                draggingHeroClientId === item.client_id
                  ? "border-[var(--brand)] bg-[var(--muted)] opacity-80 shadow-lg"
                  : heroDragOverClientId === item.client_id
                    ? "border-[var(--brand)] bg-[var(--muted)] shadow-md"
                    : "border-[var(--border)] bg-white shadow-soft"
              }`}
              onDragOver={(event) => handleHeroSlideDragOver(event, item.client_id)}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => handleHeroSlideDragStart(event, item.client_id)}
                onDragEnd={handleHeroSlideDragEnd}
                className="h-12 w-12 cursor-grab rounded-[5px] border border-transparent text-3xl leading-none text-slate-500 transition hover:border-[var(--border)] hover:bg-white active:cursor-grabbing"
                aria-label="히어로광고 순서 이동"
                title="드래그해서 순서 이동"
              >
                ≡
              </button>

              <div>
                <input
                  id={`hero-image-${item.client_id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleHeroSlideImageSelect(item.client_id, event.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor={`hero-image-${item.client_id}`}
                  className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[5px] border border-[var(--border)] bg-white p-3 text-center transition hover:bg-slate-50"
                >
                  {item.image_preview_url || item.image ? (
                    <img
                      src={item.image_preview_url || resolveMediaUrl(item.image)}
                      alt={item.title || "썸네일"}
                      className="h-full max-h-[164px] w-full rounded-[5px] object-cover"
                    />
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[var(--ink)]">썸네일이미지</p>
                      <p className="mt-2 text-xs text-slate-500">권장 1920 x 540 +</p>
                    </>
                  )}
                </label>
              </div>

              <div className="space-y-2">
                <input
                  className="w-full border border-[var(--border)] bg-white px-4 py-3"
                  placeholder="내용"
                  value={item.title}
                  onChange={(event) => updateHeroSlideEditor(item.client_id, { title: event.target.value })}
                />
                <input
                  className="w-full border border-[var(--border)] bg-white px-4 py-3"
                  placeholder="URL"
                  value={item.href}
                  onChange={(event) => updateHeroSlideEditor(item.client_id, { href: event.target.value })}
                />
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <select
                    className="border border-[var(--border)] bg-white px-4 py-3"
                    value={item.transition_style}
                    onChange={(event) =>
                      updateHeroSlideEditor(item.client_id, { transition_style: event.target.value as HeroTransitionStyle })
                    }
                  >
                    {HOME_HERO_TRANSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-2 whitespace-nowrap border border-[var(--border)] bg-white px-3 py-3 text-sm font-semibold text-[var(--ink)]">
                    노출
                    <input
                      className="w-14 border border-[var(--border)] bg-slate-100 px-2 py-1 text-center"
                      type="number"
                      min={1}
                      value={item.display_seconds}
                      onChange={(event) =>
                        updateHeroSlideEditor(item.client_id, {
                          display_seconds: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                    초
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={item.is_active}
                      onChange={(event) => updateHeroSlideEditor(item.client_id, { is_active: event.target.checked })}
                    />
                    노출 활성
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--ink)]"
                      onClick={() => void handleSaveHeroSlideEditor(item.client_id)}
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      className="rounded-[5px] border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600"
                      onClick={() => void handleDeleteHeroSlideEditor(item.client_id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
