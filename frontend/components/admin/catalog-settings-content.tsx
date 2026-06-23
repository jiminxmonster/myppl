"use client";

import { DragEvent, FormEvent, useEffect, useMemo, useState } from "react";

import {
  AdminBoard,
  AdminExternalProvider,
  CatalogCategory,
  CatalogCategoryMapping,
  CatalogFilter,
  CatalogFilterMapping,
  CatalogFilterOption,
  HomeHeroSlide,
  CatalogReferenceImage,
  ExternalCatalogAttribute,
  ExternalCatalogCategory,
  HomeProductSectionConfig,
  HomeProductSectionSource,
  HomeBoardSectionConfig,
  SiteDisplaySettings,
  createAdminHomeHeroSlide,
  createAdminCatalogCategory,
  createAdminCatalogFilter,
  createAdminCatalogFilterOption,
  createAdminCatalogProvider,
  createAdminCatalogReferenceImage,
  createAdminCategoryMapping,
  createAdminExternalAttribute,
  createAdminExternalCategory,
  createAdminFilterMapping,
  createAdminHomeProductSection,
  deleteAdminCatalogCategory,
  deleteAdminCatalogFilter,
  deleteAdminCatalogFilterOption,
  deleteAdminHomeProductSection,
  getHotdeals,
  getAdminBoards,
  getAdminHomeHeroSlides,
  getAdminSiteDisplaySettings,
  getAdminCatalogCategories,
  getAdminCatalogFilterOptions,
  getAdminCatalogFilters,
  getAdminCatalogProviders,
  getAdminCatalogReferenceImages,
  getAdminCategoryMappings,
  getAdminExternalAttributes,
  getAdminExternalCategories,
  deleteAdminHomeHeroSlide,
  getAdminFilterMappings,
  getAdminHomeProductSections,
  getAdminHomeBoardSections,
  createAdminHomeBoardSection,
  updateAdminHomeBoardSection,
  deleteAdminHomeBoardSection,
  getBoardPosts,
  getMarketplaceItems,
  getProductPlaceholder,
  reorderAdminHomeHeroSlides,
  updateAdminCatalogCategory,
  updateAdminHomeHeroSlide,
  updateAdminSiteDisplaySettings,
  resolveMediaUrl,
  updateAdminHomeProductSection,
} from "@/lib/api";

const initialCategoryForm = {
  name: "",
  description: "",
  parent: "",
  sort_order: 0,
  is_visible: true,
  is_active: true,
};

const initialFilterForm = {
  category: 0,
  name: "",
  filter_type: "checkbox",
  source_mode: "hybrid",
  sort_order: 0,
  is_visible: true,
  is_required: false,
};

const initialOptionForm = {
  filter: 0,
  label: "",
  normalized_value: "",
  color_code: "",
  sort_order: 0,
  is_active: true,
};

const initialReferenceImageForm = {
  category: 0,
  title: "",
  description: "",
  source_mode: "manual",
  sort_order: 0,
  image: null as File | null,
};

const initialProviderForm = {
  name: "",
  code: "",
  provider_type: "api",
  base_url: "",
  credentials_hint: "",
};

const initialExternalCategoryForm = {
  provider: 0,
  external_id: "",
  name: "",
  full_path: "",
};

const initialExternalAttributeForm = {
  category: 0,
  external_key: "",
  name: "",
};

const initialCategoryMappingForm = {
  internal_category: 0,
  external_category: 0,
  status: "approved",
  note: "",
};

const initialFilterMappingForm = {
  internal_filter: 0,
  external_attribute: 0,
  status: "approved",
  note: "",
};

type HomeSectionEditorItem = {
  client_id: string;
  id: number | null;
  title: string;
  source_type: HomeProductSectionSource;
  board: number | null;
  board_name?: string | null;
  board_slug?: string | null;
  category_keyword: string;
  item_limit: number;
  sort_order: number;
  is_active: boolean;
};

type BoardSectionEditorItem = {
  client_id: string;
  id: number | null;
  title: string;
  board: number | null;
  board_name?: string | null;
  board_slug?: string | null;
  columns: 1 | 2 | 3;
  position: "left" | "center" | "right";
  content_mode: "best" | "recent";
  item_limit: number;
  sort_order: number;
  is_active: boolean;
};

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

function FilterPreviewRow({ filter, options }: { filter: CatalogFilter; options: CatalogFilterOption[] }) {
  return (
    <div className="grid gap-3 border-b border-[var(--border)] py-4 md:grid-cols-[180px_1fr]">
      <div>
        <p className="text-base font-semibold text-[var(--ink)]">{filter.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {filter.source_mode === "manual" ? "수동 입력" : filter.source_mode === "imported" ? "자동 수집" : "수동 + 자동"}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {options.length > 0 ? (
          options.map((option) => (
            <label key={option.id} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 border border-[var(--border)]" readOnly />
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
          <p className="text-sm text-slate-400">등록된 세부 항목이 아직 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function normalizeHeroHref(rawHref: string): { normalized: string; error: string } {
  const href = rawHref.trim();
  if (!href) {
    return { normalized: "", error: "" };
  }

  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("/")) {
    return { normalized: href, error: "" };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href)) {
    return { normalized: href, error: "" };
  }

  if (href.includes(" ")) {
    return { normalized: href, error: "연결 URL에는 공백이 들어갈 수 없습니다." };
  }

  if (href.includes(".")) {
    return { normalized: `https://${href}`, error: "" };
  }

  return { normalized: `/${href}`, error: "" };
}

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

function normalizeHeroSlideOrder(items: HomeHeroSlide[]): HomeHeroSlide[] {
  return [...items].sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
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

function toHomeSectionEditorItem(section: HomeProductSectionConfig): HomeSectionEditorItem {
  return {
    client_id: `section-${section.id}`,
    id: section.id,
    title: section.title,
    source_type: section.source_type,
    board: section.board ?? null,
    board_name: section.board_name ?? null,
    board_slug: section.board_slug ?? null,
    category_keyword: section.category_keyword,
    item_limit: section.item_limit || 30,
    sort_order: section.sort_order,
    is_active: section.is_active,
  };
}

function reindexHomeSectionEditors(items: HomeSectionEditorItem[]): HomeSectionEditorItem[] {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

function toBoardSectionEditorItem(section: HomeBoardSectionConfig): BoardSectionEditorItem {
  return {
    client_id: `board-section-${section.id}`,
    id: section.id,
    title: section.title,
    board: section.board ?? null,
    board_name: section.board_name ?? null,
    board_slug: section.board_slug ?? null,
    columns: (section.columns || 1) as 1 | 2 | 3,
    position: section.position || "center",
    content_mode: section.content_mode || "recent",
    item_limit: section.item_limit || 5,
    sort_order: section.sort_order,
    is_active: section.is_active,
  };
}

function reindexBoardSectionEditors(items: BoardSectionEditorItem[]): BoardSectionEditorItem[] {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

function getAllowedPositionsForColumns(columns: 1 | 2 | 3): Array<"left" | "center" | "right"> {
  if (columns === 1) return ["left", "center", "right"];
  if (columns === 2) return ["left", "center", "right"]; // allow any start; grid will span
  return ["left"]; // 3열은 전체 사용 (left로 대표)
}

export function AdminCatalogPageContent({ mode }: { mode: "ranking" | "filters" }) {
  // Board section handlers (defined inside component so they have access to state)
  function handleAddBoardSectionEditor() {
    const next: BoardSectionEditorItem = {
      client_id: `new-board-section-${Date.now()}`,
      id: null,
      title: "",
      board: allBoards[0]?.id ?? null,
      columns: 1,
      position: "center",
      content_mode: "recent",
      item_limit: 5,
      sort_order: boardSectionEditors.length,
      is_active: true,
    };
    setBoardSectionEditors((current) => reindexBoardSectionEditors([next, ...current]));
  }

  function updateBoardSectionEditor(clientId: string, patch: Partial<BoardSectionEditorItem>) {
    setBoardSectionEditors((current) => current.map((item) => (item.client_id === clientId ? { ...item, ...patch } : item)));
  }

  function handleDeleteBoardSectionEditor(clientId: string) {
    setBoardSectionEditors((current) => current.filter((item) => item.client_id !== clientId));
  }

  async function handleSaveBoardSectionEditors() {
    setError("");
    setNotice("");
    try {
      const ordered = reindexBoardSectionEditors(boardSectionEditors);
      for (const item of ordered) {
        if (!item.title.trim()) {
          throw new Error("게시판 노출 항목에 제목을 입력하세요.");
        }
        if (!item.board) {
          throw new Error(`'${item.title.trim()}' 항목에 연결할 게시판을 선택하세요.`);
        }
        const payload = {
          title: item.title.trim(),
          board: item.board,
          columns: item.columns,
          position: item.position,
          content_mode: item.content_mode,
          item_limit: Math.max(1, item.item_limit || 5),
          sort_order: item.sort_order,
          is_active: item.is_active,
        };
        if (item.id === null) {
          await createAdminHomeBoardSection(payload as any);
        } else {
          await updateAdminHomeBoardSection(item.id, payload as any);
        }
      }
      const fresh = await getAdminHomeBoardSections();
      setBoardSectionEditors(
        reindexBoardSectionEditors(
          [...fresh].sort((a, b) => a.sort_order - b.sort_order || (a.id || 0) - (b.id || 0)).map(toBoardSectionEditorItem)
        )
      );
      handleSuccess("게시판 노출 설정이 저장되었습니다.");
    } catch (e: any) {
      setError(e?.message || "게시판 노출 저장에 실패했습니다.");
    }
  }
  const [providers, setProviders] = useState<AdminExternalProvider[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [filters, setFilters] = useState<CatalogFilter[]>([]);
  const [options, setOptions] = useState<CatalogFilterOption[]>([]);
  const [referenceImages, setReferenceImages] = useState<CatalogReferenceImage[]>([]);
  const [externalCategories, setExternalCategories] = useState<ExternalCatalogCategory[]>([]);
  const [externalAttributes, setExternalAttributes] = useState<ExternalCatalogAttribute[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<CatalogCategoryMapping[]>([]);
  const [filterMappings, setFilterMappings] = useState<CatalogFilterMapping[]>([]);
  const [homeSectionEditors, setHomeSectionEditors] = useState<HomeSectionEditorItem[]>([]);
  const [boardSectionEditors, setBoardSectionEditors] = useState<BoardSectionEditorItem[]>([]);
  const [productBoards, setProductBoards] = useState<AdminBoard[]>([]);
  const [allBoards, setAllBoards] = useState<AdminBoard[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteDisplaySettings | null>(null);
  const [draggingHomeSectionId, setDraggingHomeSectionId] = useState<string | null>(null);
  const [homeSectionDragOverId, setHomeSectionDragOverId] = useState<string | null>(null);
  const [isHomeSectionOrderDirty, setIsHomeSectionOrderDirty] = useState(false);
  const [heroSlideEditors, setHeroSlideEditors] = useState<HeroSlideEditorItem[]>([]);
  const [draggingHeroClientId, setDraggingHeroClientId] = useState<string | null>(null);
  const [heroDragOverClientId, setHeroDragOverClientId] = useState<string | null>(null);
  const [isHeroSlideOrderDirty, setIsHeroSlideOrderDirty] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [providerForm, setProviderForm] = useState(initialProviderForm);
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);
  const [filterForm, setFilterForm] = useState(initialFilterForm);
  const [optionForm, setOptionForm] = useState(initialOptionForm);
  const [referenceImageForm, setReferenceImageForm] = useState(initialReferenceImageForm);
  const [externalCategoryForm, setExternalCategoryForm] = useState(initialExternalCategoryForm);
  const [externalAttributeForm, setExternalAttributeForm] = useState(initialExternalAttributeForm);
  const [categoryMappingForm, setCategoryMappingForm] = useState(initialCategoryMappingForm);
  const [filterMappingForm, setFilterMappingForm] = useState(initialFilterMappingForm);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedCategoryDescription, setSelectedCategoryDescription] = useState("");
  const [pendingFilterName, setPendingFilterName] = useState("");
  const [pendingTopCategoryName, setPendingTopCategoryName] = useState("");
  const [showTopCategoryInput, setShowTopCategoryInput] = useState(false);
  const [pendingOptionLabelByFilter, setPendingOptionLabelByFilter] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadData();
  }, [mode]);

  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? null;
  const filtersForSelectedCategory = filters.filter((item) => item.category === selectedCategoryId);
  const topLevelCategories = useMemo(
    () => categories.filter((item) => item.parent === null).sort((left, right) => left.sort_order - right.sort_order || left.id - right.id),
    [categories],
  );
  const topTabs = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }
    if (selectedCategory.parent) {
      return categories.filter((item) => item.parent === selectedCategory.parent);
    }
    const children = categories.filter((item) => item.parent === selectedCategory.id);
    return children.length > 0 ? children : [selectedCategory];
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) {
      setSelectedCategoryName("");
      setSelectedCategoryDescription("");
      return;
    }
    setSelectedCategoryName(selectedCategory.name);
    setSelectedCategoryDescription(selectedCategory.description || "");
  }, [selectedCategory]);

  async function loadData() {
    try {
      if (mode === "ranking") {
        const [homeSectionItems, boardSectionItems, displaySettings, boardItems] = await Promise.all([
          getAdminHomeProductSections(),
          getAdminHomeBoardSections(),
          getAdminSiteDisplaySettings(),
          getAdminBoards(),
        ]);
        setSiteSettings(displaySettings);
        setProductBoards(boardItems.filter((board) => board.board_type === "product"));
        setAllBoards(boardItems);
        setHomeSectionEditors(
          reindexHomeSectionEditors(
            [...homeSectionItems]
              .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
              .map(toHomeSectionEditorItem),
          ),
        );
        setBoardSectionEditors(
          reindexBoardSectionEditors(
            [...boardSectionItems]
              .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
              .map(toBoardSectionEditorItem),
          ),
        );
        setIsHomeSectionOrderDirty(false);
        setError("");
        return;
      }

      const [
        providerItems,
        categoryItems,
        filterItems,
        optionItems,
        imageItems,
        externalCategoryItems,
        externalAttributeItems,
        categoryMappingItems,
        filterMappingItems,
        homeSectionItems,
        homeHeroSlideItems,
        displaySettings,
        boardItems,
      ] = await Promise.all([
        getAdminCatalogProviders(),
        getAdminCatalogCategories(),
        getAdminCatalogFilters(),
        getAdminCatalogFilterOptions(),
        getAdminCatalogReferenceImages(),
        getAdminExternalCategories(),
        getAdminExternalAttributes(),
        getAdminCategoryMappings(),
        getAdminFilterMappings(),
        getAdminHomeProductSections(),
        getAdminHomeHeroSlides(),
        getAdminSiteDisplaySettings(),
        getAdminBoards(),
      ]);

      setProviders(providerItems);
      setCategories(categoryItems);
      setFilters(filterItems);
      setOptions(optionItems);
      setReferenceImages(imageItems);
      setExternalCategories(externalCategoryItems);
      setExternalAttributes(externalAttributeItems);
      setCategoryMappings(categoryMappingItems);
      setFilterMappings(filterMappingItems);
      setProductBoards(boardItems.filter((board) => board.board_type === "product"));
      setHomeSectionEditors(
        reindexHomeSectionEditors(
          [...homeSectionItems]
            .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
            .map(toHomeSectionEditorItem),
        ),
      );
      setIsHomeSectionOrderDirty(false);
      setSiteSettings(displaySettings);
      const orderedHeroSlides = normalizeHeroSlideOrder(homeHeroSlideItems);
      setHeroSlideEditors((current) => {
        current.forEach((item) => {
          if (item.image_preview_url) {
            URL.revokeObjectURL(item.image_preview_url);
          }
        });
        return orderedHeroSlides.map(toHeroSlideEditorItem);
      });
      setIsHeroSlideOrderDirty(false);

      const firstCategoryId = categoryItems[0]?.id ?? 0;
      const firstFilterId = filterItems[0]?.id ?? 0;
      const firstProviderId = providerItems[0]?.id ?? 0;
      const firstExternalCategoryId = externalCategoryItems[0]?.id ?? 0;
      const firstExternalAttributeId = externalAttributeItems[0]?.id ?? 0;

      setSelectedCategoryId((current) => current || firstCategoryId);
      setFilterForm((current) => ({ ...current, category: current.category || firstCategoryId }));
      setReferenceImageForm((current) => ({ ...current, category: current.category || firstCategoryId }));
      setCategoryMappingForm((current) => ({
        ...current,
        internal_category: current.internal_category || firstCategoryId,
        external_category: current.external_category || firstExternalCategoryId,
      }));
      setOptionForm((current) => ({ ...current, filter: current.filter || firstFilterId }));
      setExternalCategoryForm((current) => ({ ...current, provider: current.provider || firstProviderId }));
      setExternalAttributeForm((current) => ({ ...current, category: current.category || firstExternalCategoryId }));
      setFilterMappingForm((current) => ({
        ...current,
        internal_filter: current.internal_filter || firstFilterId,
        external_attribute: current.external_attribute || firstExternalAttributeId,
      }));
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "상품 필터 관리 데이터를 불러오지 못했습니다.");
    }
  }

  async function loadHomeHeroSlides() {
    try {
      const homeHeroSlideItems = await getAdminHomeHeroSlides();
      const orderedHeroSlides = normalizeHeroSlideOrder(homeHeroSlideItems);
      setHeroSlideEditors((current) => {
        current.forEach((item) => {
          if (item.image_preview_url) {
            URL.revokeObjectURL(item.image_preview_url);
          }
        });
        return orderedHeroSlides.map(toHeroSlideEditorItem);
      });
      setIsHeroSlideOrderDirty(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "메인 전면광고 목록을 불러오지 못했습니다.");
    }
  }

  function handleSuccess(message: string) {
    setNotice(message);
    setError("");
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminCatalogCategory({
        ...categoryForm,
        parent: categoryForm.parent ? Number(categoryForm.parent) : null,
      });
      setCategories((current) => [...current, created]);
      setSelectedCategoryId(created.id);
      setCategoryForm(initialCategoryForm);
      setFilterForm((current) => ({ ...current, category: created.id }));
      setReferenceImageForm((current) => ({ ...current, category: created.id }));
      handleSuccess("카테고리를 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "카테고리 등록에 실패했습니다.");
    }
  }

  async function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminCatalogFilter(filterForm);
      setFilters((current) => [...current, created]);
      setOptionForm((current) => ({ ...current, filter: created.id }));
      setFilterMappingForm((current) => ({ ...current, internal_filter: current.internal_filter || created.id }));
      handleSuccess("상세 검색 필터를 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "필터 등록에 실패했습니다.");
    }
  }

  async function handleOptionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminCatalogFilterOption(optionForm);
      setOptions((current) => [...current, created]);
      setOptionForm((current) => ({ ...initialOptionForm, filter: current.filter }));
      handleSuccess("세부 체크 항목을 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "세부 항목 등록에 실패했습니다.");
    }
  }

  async function handleAddTopCategory() {
    const nextName = pendingTopCategoryName.trim();
    if (!nextName) {
      setError("카테고리명을 입력하세요.");
      return;
    }
    try {
      const created = await createAdminCatalogCategory({
        name: nextName,
        description: "",
        parent: null,
        sort_order: topLevelCategories.length,
        is_visible: true,
        is_active: true,
      });
      setCategories((current) => [...current, created]);
      setSelectedCategoryId(created.id);
      setPendingTopCategoryName("");
      setShowTopCategoryInput(false);
      handleSuccess("카테고리를 추가했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "카테고리 추가에 실패했습니다.");
    }
  }

  async function handleSaveSelectedCategory() {
    if (!selectedCategory) {
      setError("카테고리를 먼저 선택하세요.");
      return;
    }
    if (!selectedCategoryName.trim()) {
      setError("카테고리명을 입력하세요.");
      return;
    }
    try {
      const updated = await updateAdminCatalogCategory(selectedCategory.id, {
        name: selectedCategoryName.trim(),
        description: selectedCategoryDescription.trim(),
      });
      setCategories((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      handleSuccess("카테고리 정보를 저장했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "카테고리 저장에 실패했습니다.");
    }
  }

  async function handleDeleteSelectedCategory() {
    if (!selectedCategory) {
      setError("삭제할 카테고리를 선택하세요.");
      return;
    }
    if (!window.confirm(`'${selectedCategory.name}' 카테고리를 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteAdminCatalogCategory(selectedCategory.id);
      const remaining = categories.filter((item) => item.id !== selectedCategory.id);
      setCategories(remaining);
      const nextCategoryId = remaining.find((item) => item.parent === null)?.id ?? remaining[0]?.id ?? 0;
      setSelectedCategoryId(nextCategoryId);
      handleSuccess("카테고리를 삭제했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "카테고리 삭제에 실패했습니다.");
    }
  }

  async function handleAddFilterField() {
    if (!selectedCategoryId) {
      setError("카테고리를 먼저 선택하세요.");
      return;
    }
    if (!pendingFilterName.trim()) {
      setError("항목명을 입력하세요.");
      return;
    }
    try {
      const created = await createAdminCatalogFilter({
        category: selectedCategoryId,
        name: pendingFilterName.trim(),
        filter_type: "checkbox",
        source_mode: "manual",
        is_required: false,
        is_visible: true,
        sort_order: filtersForSelectedCategory.length,
      });
      setFilters((current) => [...current, created]);
      setPendingFilterName("");
      handleSuccess("체크 항목을 추가했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "체크 항목 추가에 실패했습니다.");
    }
  }

  async function handleDeleteFilterField(filterId: number) {
    if (!window.confirm("이 체크 항목을 삭제하시겠습니까?")) {
      return;
    }
    try {
      await deleteAdminCatalogFilter(filterId);
      setFilters((current) => current.filter((item) => item.id !== filterId));
      setOptions((current) => current.filter((item) => item.filter !== filterId));
      handleSuccess("체크 항목을 삭제했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "체크 항목 삭제에 실패했습니다.");
    }
  }

  async function handleAddFilterOption(filterId: number) {
    const label = pendingOptionLabelByFilter[filterId]?.trim() ?? "";
    if (!label) {
      setError("체크박스 값을 입력하세요.");
      return;
    }
    const filterOptions = options.filter((item) => Number(item.filter) === filterId);
    try {
      const created = await createAdminCatalogFilterOption({
        filter: filterId,
        label,
        normalized_value: label,
        sort_order: filterOptions.length,
        is_active: true,
      });
      setOptions((current) => [...current, created]);
      setPendingOptionLabelByFilter((current) => ({ ...current, [filterId]: "" }));
      handleSuccess("체크박스 항목을 추가했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "체크박스 항목 추가에 실패했습니다.");
    }
  }

  async function handleDeleteFilterOption(optionId: number) {
    if (!window.confirm("이 체크박스 항목을 삭제하시겠습니까?")) {
      return;
    }
    try {
      await deleteAdminCatalogFilterOption(optionId);
      setOptions((current) => current.filter((item) => item.id !== optionId));
      handleSuccess("체크박스 항목을 삭제했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "체크박스 항목 삭제에 실패했습니다.");
    }
  }

  async function handleReferenceImageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!referenceImageForm.image) {
      setError("첨부 이미지를 선택해야 합니다.");
      return;
    }

    try {
      const created = await createAdminCatalogReferenceImage({
        category: referenceImageForm.category,
        title: referenceImageForm.title,
        description: referenceImageForm.description,
        source_mode: referenceImageForm.source_mode,
        sort_order: referenceImageForm.sort_order,
        image: referenceImageForm.image,
      });
      setReferenceImages((current) => [...current, created]);
      setReferenceImageForm((current) => ({
        ...initialReferenceImageForm,
        category: current.category,
      }));
      handleSuccess("하단 첨부 이미지를 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "첨부 이미지 등록에 실패했습니다.");
    }
  }

  async function handleProviderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminCatalogProvider({
        ...providerForm,
        meta: {},
        is_active: true,
      });
      setProviders((current) => [...current, created]);
      setExternalCategoryForm((current) => ({ ...current, provider: created.id }));
      setProviderForm(initialProviderForm);
      handleSuccess("외부 연동 제공자를 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "제공자 등록에 실패했습니다.");
    }
  }

  async function handleExternalCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminExternalCategory(externalCategoryForm);
      setExternalCategories((current) => [...current, created]);
      setExternalCategoryForm((current) => ({ ...initialExternalCategoryForm, provider: current.provider }));
      setExternalAttributeForm((current) => ({ ...current, category: created.id }));
      setCategoryMappingForm((current) => ({ ...current, external_category: created.id }));
      handleSuccess("외부 카테고리 후보를 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "외부 카테고리 등록에 실패했습니다.");
    }
  }

  async function handleExternalAttributeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminExternalAttribute(externalAttributeForm);
      setExternalAttributes((current) => [...current, created]);
      setExternalAttributeForm((current) => ({ ...initialExternalAttributeForm, category: current.category }));
      setFilterMappingForm((current) => ({ ...current, external_attribute: created.id }));
      handleSuccess("외부 속성 후보를 등록했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "외부 속성 등록에 실패했습니다.");
    }
  }

  async function handleCategoryMappingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminCategoryMapping(categoryMappingForm);
      setCategoryMappings((current) => [created, ...current]);
      handleSuccess("내부 카테고리와 외부 카테고리를 연결했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "카테고리 매핑에 실패했습니다.");
    }
  }

  async function handleFilterMappingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await createAdminFilterMapping(filterMappingForm);
      setFilterMappings((current) => [created, ...current]);
      handleSuccess("내부 필터와 외부 속성을 연결했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "필터 매핑에 실패했습니다.");
    }
  }

  function handleAddHomeSectionEditor() {
    const nextItem: HomeSectionEditorItem = {
      client_id: `new-section-${Date.now()}`,
      id: null,
      title: "",
      source_type: "recent_search",
      board: null,
      category_keyword: "",
      item_limit: 30,
      sort_order: homeSectionEditors.length,
      is_active: true,
    };
    setHomeSectionEditors((current) => reindexHomeSectionEditors([nextItem, ...current]));
    setIsHomeSectionOrderDirty(true);
  }

  function updateHomeSectionEditor(clientId: string, patch: Partial<HomeSectionEditorItem>) {
    setHomeSectionEditors((current) => current.map((item) => (item.client_id === clientId ? { ...item, ...patch } : item)));
    setIsHomeSectionOrderDirty(true);
  }

  async function handleToggleSideCategoryMenu() {
    const current = siteSettings?.show_side_category_menu ?? false;
    try {
      const updated = await updateAdminSiteDisplaySettings({ show_side_category_menu: !current });
      setSiteSettings(updated);
      handleSuccess(
        updated.show_side_category_menu
          ? "좌측 녹색 메뉴로 노출하도록 변경했습니다."
          : "상단 가로형 아이콘 카테고리로 노출하도록 변경했습니다."
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "좌측 메뉴 설정 저장에 실패했습니다.");
    }
  }

  function handleHomeSectionDragStart(event: DragEvent<HTMLElement>, clientId: string) {
    event.dataTransfer.effectAllowed = "move";
    setDraggingHomeSectionId(clientId);
  }

  function handleHomeSectionDragOver(event: DragEvent<HTMLElement>, targetClientId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (!draggingHomeSectionId || draggingHomeSectionId === targetClientId) {
      return;
    }
    setHomeSectionEditors((current) => {
      const fromIndex = current.findIndex((item) => item.client_id === draggingHomeSectionId);
      const toIndex = current.findIndex((item) => item.client_id === targetClientId);
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      const nextItems = [...current];
      const [moved] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, moved);
      return reindexHomeSectionEditors(nextItems);
    });
    setHomeSectionDragOverId(targetClientId);
    setIsHomeSectionOrderDirty(true);
  }

  function handleHomeSectionDragEnd() {
    setDraggingHomeSectionId(null);
    setHomeSectionDragOverId(null);
  }

  async function handleDeleteHomeSectionEditor(clientId: string) {
    const item = homeSectionEditors.find((entry) => entry.client_id === clientId);
    if (!item) {
      return;
    }
    if (item.id === null) {
      setHomeSectionEditors((current) => reindexHomeSectionEditors(current.filter((entry) => entry.client_id !== clientId)));
      setIsHomeSectionOrderDirty(true);
      return;
    }
    if (!window.confirm(`'${item.title || "상품순위노출"}' 항목을 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteAdminHomeProductSection(item.id);
      const next = homeSectionEditors.filter((entry) => entry.client_id !== clientId);
      setHomeSectionEditors(reindexHomeSectionEditors(next));
      setIsHomeSectionOrderDirty(true);
      handleSuccess("상품순위노출 항목을 삭제했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "상품순위노출 항목 삭제에 실패했습니다.");
    }
  }

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function handleOpenKeywordProducts(item: HomeSectionEditorItem) {
    const popup = window.open("", "_blank", "popup,width=1040,height=780,scrollbars=yes,resizable=yes");
    if (!popup) {
      setError("팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.");
      return;
    }

    popup.document.write("<!doctype html><html><head><meta charset='utf-8'><title>키워드 상품 보기</title></head><body style='font-family:sans-serif;padding:24px;'>불러오는 중...</body></html>");
    popup.document.close();

    try {
      const selectedBoard =
        item.source_type === "product_board" ? productBoards.find((board) => board.id === item.board) : null;
      let sourceItems: Array<Record<string, unknown>>;
      let sourceLabel: string;
      let placeholderSource: "hotdeal" | "marketplace" = "marketplace";

      if (item.source_type === "product_board") {
        if (!selectedBoard) {
          throw new Error("연결할 상품게시판을 먼저 선택해 주세요.");
        }
        sourceItems = (await getBoardPosts(selectedBoard.slug)) as unknown as Array<Record<string, unknown>>;
        sourceLabel = selectedBoard.name;
      } else if (item.source_type === "recent_search") {
        sourceItems = ([...(await getHotdeals()), ...(await getMarketplaceItems())] as unknown) as Array<Record<string, unknown>>;
        sourceLabel = "최근검색상품";
      } else if (item.source_type === "hotdeal") {
        sourceItems = (await getHotdeals()) as unknown as Array<Record<string, unknown>>;
        sourceLabel = "핫딜";
        placeholderSource = "hotdeal";
      } else {
        sourceItems = (await getMarketplaceItems()) as unknown as Array<Record<string, unknown>>;
        sourceLabel = "중고장터";
      }
      const keyword = item.category_keyword.trim().toLowerCase();
      const filtered = sourceItems
        .filter((entry) => {
          if (!keyword) return true;
          const title = `${(entry as { title?: string }).title ?? ""}`.toLowerCase();
          const category = `${(entry as { category_name?: string; board_name?: string }).category_name ?? (entry as { board_name?: string }).board_name ?? selectedBoard?.name ?? ""}`.toLowerCase();
          return title.includes(keyword) || category.includes(keyword);
        })
        .slice(0, Math.max(1, item.item_limit || 30));

      const cards = filtered
        .map((entry) => {
          const title = escapeHtml(`${(entry as { title?: string }).title ?? "제목 없음"}`);
          const category = escapeHtml(`${(entry as { category_name?: string; board_name?: string }).category_name ?? (entry as { board_name?: string }).board_name ?? selectedBoard?.name ?? "-"}`);
          const views = Number((entry as { view_count?: number; views?: number }).view_count ?? (entry as { views?: number }).views ?? 0).toLocaleString("ko-KR");
          const image =
            (entry as { image?: string | null }).image ||
            (entry as { external_image_url?: string | null }).external_image_url ||
            (entry as { thumbnail_image?: string | null }).thumbnail_image ||
            getProductPlaceholder(placeholderSource, (entry as { category_name?: string }).category_name || selectedBoard?.name);
          const imageUrl = escapeHtml(resolveMediaUrl(image || ""));
          return `<article style='border:1px solid #ddd;border-radius:8px;padding:12px;background:#fff'>
            <img src='${imageUrl}' alt='${title}' style='width:100%;height:160px;object-fit:cover;border-radius:6px;background:#f4f4f4'/>
            <h3 style='margin:10px 0 6px;font-size:16px'>${title}</h3>
            <p style='margin:0;color:#666;font-size:13px'>${category} · 조회 ${views}</p>
          </article>`;
        })
        .join("");

      popup.document.open();
      popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>키워드 상품 보기</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f7f7f7; }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 20px; }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p.meta { margin: 0 0 18px; color: #666; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>키워드 상품 보기</h1>
    <p class="meta">키워드: ${escapeHtml(item.category_keyword || "전체")} · 소스: ${escapeHtml(sourceLabel)} · 노출수: ${Math.max(1, item.item_limit || 30)}위</p>
    <section class="grid">${cards || "<p>조건에 맞는 상품이 없습니다.</p>"}</section>
  </div>
</body>
</html>`);
      popup.document.close();
    } catch (requestError) {
      popup.document.open();
      popup.document.write(`<p style="padding:20px;font-family:sans-serif;color:#b91c1c;">${escapeHtml(requestError instanceof Error ? requestError.message : "상품 데이터를 불러오지 못했습니다.")}</p>`);
      popup.document.close();
    }
  }

  async function handleSaveHomeSectionEditors() {
    setError("");
    try {
      const ordered = reindexHomeSectionEditors(homeSectionEditors);
      const persisted: HomeProductSectionConfig[] = [];
      for (const item of ordered) {
        if (!item.title.trim()) {
          throw new Error("모든 상품순위노출 항목에 제목을 입력해야 합니다.");
        }
        if (item.source_type === "product_board" && !item.board) {
          throw new Error(`'${item.title.trim()}' 상품탭에 연결할 상품게시판을 선택해야 합니다.`);
        }
        const linkedBoard = item.source_type === "product_board" ? item.board : null;
        if (item.id === null) {
          const created = await createAdminHomeProductSection({
            title: item.title.trim(),
            description: "",
            source_type: item.source_type,
            board: linkedBoard,
            category_keyword: item.category_keyword.trim(),
            item_limit: Math.max(1, item.item_limit || 30),
            sort_order: item.sort_order,
            is_active: item.is_active,
          });
          persisted.push(created);
        } else {
          const updated = await updateAdminHomeProductSection(item.id, {
            title: item.title.trim(),
            source_type: item.source_type,
            board: linkedBoard,
            category_keyword: item.category_keyword.trim(),
            item_limit: Math.max(1, item.item_limit || 30),
            sort_order: item.sort_order,
            is_active: item.is_active,
          });
          persisted.push(updated);
        }
      }
      const sorted = [...persisted].sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
      setHomeSectionEditors(reindexHomeSectionEditors(sorted.map(toHomeSectionEditorItem)));
      setIsHomeSectionOrderDirty(false);
      handleSuccess("상품순위노출 설정을 저장했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "상품순위노출 설정 저장에 실패했습니다.");
    }
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
    if (!draggingHeroClientId || draggingHeroClientId === targetClientId) {
      return;
    }

    setHeroSlideEditors((current) => {
      const fromIndex = current.findIndex((item) => item.client_id === draggingHeroClientId);
      const toIndex = current.findIndex((item) => item.client_id === targetClientId);
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
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
        if (item.client_id !== clientId) {
          return item;
        }
        if (item.image_preview_url) {
          URL.revokeObjectURL(item.image_preview_url);
        }
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
    if (!item) {
      return;
    }
    if (!item.title.trim()) {
      setError("히어로광고 내용은 필수입니다.");
      return;
    }
    const { normalized, error: hrefError } = normalizeHeroHref(item.href);
    if (hrefError) {
      setError(hrefError);
      return;
    }

    try {
      if (item.id === null) {
        if (!item.image_file) {
          setError("썸네일 이미지를 등록해야 합니다.");
          return;
        }
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
        await loadHomeHeroSlides();
        handleSuccess("히어로광고를 추가했습니다.");
        return;
      }

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
      await loadHomeHeroSlides();
      handleSuccess("히어로광고를 저장했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "히어로광고 저장에 실패했습니다.");
    }
  }

  async function handleDeleteHeroSlideEditor(clientId: string) {
    const item = heroSlideEditors.find((entry) => entry.client_id === clientId);
    if (!item) {
      return;
    }

    if (item.id === null) {
      if (item.image_preview_url) {
        URL.revokeObjectURL(item.image_preview_url);
      }
      setHeroSlideEditors((current) => reindexHeroSlideEditors(current.filter((entry) => entry.client_id !== clientId)));
      setIsHeroSlideOrderDirty(true);
      return;
    }

    if (!window.confirm(`'${item.title || "히어로광고"}'를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteAdminHomeHeroSlide(item.id);
      await loadHomeHeroSlides();
      handleSuccess("히어로광고를 삭제했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "히어로광고 삭제에 실패했습니다.");
    }
  }

  async function handleSaveHeroSlideOrder() {
    const persistedIds = heroSlideEditors.map((item) => item.id).filter((id): id is number => id !== null);
    if (persistedIds.length === 0) {
      setIsHeroSlideOrderDirty(false);
      return;
    }

    try {
      await reorderAdminHomeHeroSlides(persistedIds);
      await loadHomeHeroSlides();
      setIsHeroSlideOrderDirty(false);
      handleSuccess("히어로광고 순서를 저장했습니다.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "히어로광고 순서 저장에 실패했습니다.");
    }
  }

  async function handleApplyAllHeroSlides() {
    setError("");
    try {
      const orderedEditors = reindexHeroSlideEditors(heroSlideEditors);
      const persistedOrder: number[] = [];

      for (const item of orderedEditors) {
        if (!item.title.trim()) {
          throw new Error("모든 히어로광고의 내용(제목)을 입력해야 합니다.");
        }
        const { normalized, error: hrefError } = normalizeHeroHref(item.href);
        if (hrefError) {
          throw new Error(hrefError);
        }

        if (item.id === null) {
          if (!item.image_file) {
            throw new Error("새 히어로광고는 썸네일 이미지를 등록해야 합니다.");
          }
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
          continue;
        }

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

      {mode === "ranking" ? (
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[0.67rem] border border-[var(--border)] bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)]">좌측 녹색 메뉴</h2>
            <p className="mt-1 text-sm text-slate-600">켜짐은 좌측 녹색 메뉴, 꺼짐은 상단 가로형 아이콘 카테고리로 표시합니다.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(siteSettings?.show_side_category_menu)}
            onClick={() => void handleToggleSideCategoryMenu()}
            className={`inline-flex min-w-[112px] items-center justify-center rounded-[5px] px-4 py-2 text-sm font-semibold text-white ${
              siteSettings?.show_side_category_menu ? "bg-[var(--brand)]" : "bg-slate-500"
            }`}
          >
            {siteSettings?.show_side_category_menu ? "켜짐" : "꺼짐"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">홈 가로형 상품 탭</h2>
            <p className="mt-2 text-sm text-slate-600">타이틀과 노출 개수를 정하고, 최근검색상품/핫딜/중고장터/상품게시판 소스로 여러 탭을 생성합니다.</p>
          </div>
          <button
            type="button"
            className="rounded-[5px] border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
            onClick={handleAddHomeSectionEditor}
          >
            + 상품탭추가
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {homeSectionEditors.length > 0 ? (
            homeSectionEditors.map((item) => {
              const isDragging = draggingHomeSectionId === item.client_id;
              const isDragOver = homeSectionDragOverId === item.client_id && draggingHomeSectionId !== item.client_id;
              return (
                <article
                  key={item.client_id}
                  onDragOver={(event) => handleHomeSectionDragOver(event, item.client_id)}
                  onDragEnd={handleHomeSectionDragEnd}
                  className={`grid gap-4 rounded-[0.67rem] border p-5 transition-all md:grid-cols-[56px_1fr_auto] ${
                    isDragging ? "border-[var(--brand)] bg-[var(--muted)] opacity-80 shadow-lg" : ""
                  } ${isDragOver ? "border-[var(--brand)] bg-[var(--muted)] shadow-md" : "border-[var(--border)] bg-white shadow-soft"}`}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => handleHomeSectionDragStart(event, item.client_id)}
                    onDragEnd={handleHomeSectionDragEnd}
                    className="flex h-12 w-12 cursor-grab items-center justify-center rounded-[5px] border border-transparent text-slate-600 transition hover:border-[var(--border)] hover:bg-slate-50 active:cursor-grabbing"
                    aria-label="순서 이동"
                    title="이 버튼을 드래그해서 순서 이동"
                  >
                    <span className="text-3xl leading-none">≡</span>
                  </button>

                  <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <input
                      className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal"
                      placeholder="제목"
                      value={item.title}
                      onChange={(event) => updateHomeSectionEditor(item.client_id, { title: event.target.value })}
                    />
                    <select
                      className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal"
                      value={item.source_type}
                      onChange={(event) => {
                        const sourceType = event.target.value as HomeProductSectionSource;
                        updateHomeSectionEditor(item.client_id, {
                          source_type: sourceType,
                          board: sourceType === "product_board" ? item.board ?? productBoards[0]?.id ?? null : null,
                        });
                      }}
                    >
                      <option value="recent_search">최근검색상품</option>
                      <option value="hotdeal">핫딜</option>
                      <option value="marketplace">중고장터</option>
                      <option value="product_board">상품게시판</option>
                    </select>

                    {item.source_type === "product_board" ? (
                      <select
                        className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal"
                        value={item.board ?? ""}
                        onChange={(event) => updateHomeSectionEditor(item.client_id, { board: event.target.value ? Number(event.target.value) : null })}
                      >
                        <option value="">연결 상품게시판 선택</option>
                        {productBoards.map((board) => (
                          <option key={board.id} value={board.id}>
                            {board.name}
                            {board.product_board_type === "live_special" ? " · 라이브특가" : ""}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    <input
                      className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal"
                      placeholder="카테고리 키워드"
                      value={item.category_keyword}
                      onChange={(event) => updateHomeSectionEditor(item.client_id, { category_keyword: event.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        className="w-full rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-center text-sm font-normal"
                        type="number"
                        min={1}
                        value={item.item_limit}
                        onChange={(event) => updateHomeSectionEditor(item.client_id, { item_limit: Number(event.target.value) || 1 })}
                      />
                      <span className="whitespace-nowrap text-sm font-normal text-[var(--ink)]">위</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                      <button
                        type="button"
                        className="rounded-[5px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-normal text-[var(--ink)]"
                        onClick={() => void handleOpenKeywordProducts(item)}
                      >
                        키워드 상품 보기
                      </button>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          onChange={(event) => updateHomeSectionEditor(item.client_id, { is_active: event.target.checked })}
                        />
                        활성 노출
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="h-10 rounded-[5px] border border-red-200 bg-white px-3 text-xl leading-none text-red-500"
                    aria-label="항목 삭제"
                    onClick={() => void handleDeleteHomeSectionEditor(item.client_id)}
                  >
                    ×
                  </button>
                </article>
              );
            })
          ) : (
            <div className="rounded-[0.67rem] border border-dashed border-[var(--border)] bg-white px-6 py-10 text-center text-sm text-slate-500">
              등록된 상품 탭이 없습니다. `+ 상품탭추가`를 눌러 생성하세요.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-[5px] border border-[var(--border)] bg-white px-8 py-2 text-sm font-normal text-[var(--ink)]"
            onClick={() => void handleSaveHomeSectionEditors()}
          >
            저장
          </button>
        </div>
        {isHomeSectionOrderDirty ? <p className="mt-3 text-right text-xs font-semibold text-[var(--brand)]">순서/값 변경됨 - 저장 필요</p> : null}
      </section>
      ) : null}

      {/* ===== 게시판노출 (커뮤니티 글 노출) ===== */}
      {mode === "ranking" ? (
      <section className="mt-10 rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">게시판 노출</h2>
            <p className="mt-1 text-sm text-slate-600">메인 하단에 일반/커뮤니티 게시판의 글을 노출합니다. 1열/2열/3열 + 위치(좌측/중앙/우측)를 선택하세요. 베스트 또는 최근 컨텐츠를 고를 수 있습니다.</p>
          </div>
          <button
            type="button"
            className="rounded-[5px] border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)]"
            onClick={handleAddBoardSectionEditor}
          >
            + 게시판노출 추가
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {boardSectionEditors.length > 0 ? (
            boardSectionEditors.map((item) => {
              const allowedPositions = getAllowedPositionsForColumns(item.columns);
              return (
                <article key={item.client_id} className="rounded-[0.67rem] border border-[var(--border)] bg-white p-5 shadow-soft">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm font-normal"
                      placeholder="섹션 제목 (예: 커뮤니티 인기글)"
                      value={item.title}
                      onChange={(event) => updateBoardSectionEditor(item.client_id, { title: event.target.value })}
                    />
                    <button
                      type="button"
                      className="h-10 rounded-[5px] border border-red-200 bg-white px-3 text-xl leading-none text-red-500"
                      onClick={() => void handleDeleteBoardSectionEditor(item.client_id)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">연결 게시판</div>
                      <select
                        className="w-full rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm"
                        value={item.board ?? ""}
                        onChange={(event) => updateBoardSectionEditor(item.client_id, { board: event.target.value ? Number(event.target.value) : null })}
                      >
                        <option value="">게시판 선택</option>
                        {allBoards.map((b) => (
                          <option key={b.id} value={b.id}>{b.name} ({b.slug})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">노출 열 수</div>
                      <div className="flex gap-2">
                        {[1, 2, 3].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`flex-1 rounded-[5px] border px-3 py-1.5 text-sm ${item.columns === c ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-white"}`}
                            onClick={() => {
                              const newCols = c as 1 | 2 | 3;
                              const newAllowed = getAllowedPositionsForColumns(newCols);
                              const newPos = newAllowed.includes(item.position) ? item.position : newAllowed[0];
                              updateBoardSectionEditor(item.client_id, { columns: newCols, position: newPos });
                            }}
                          >
                            {c}열
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">위치 (중복 선택 불가, 앞 영역 차지 시 선택 제한)</div>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((pos) => {
                          const label = pos === "left" ? "좌측" : pos === "center" ? "중앙" : "우측";
                          const disabled = !allowedPositions.includes(pos);
                          return (
                            <label key={pos} className={`inline-flex items-center gap-1 rounded-[5px] border px-3 py-1.5 text-sm cursor-pointer ${disabled ? "opacity-40" : ""} ${item.position === pos ? "border-[var(--brand)] bg-[var(--muted)]" : "border-[var(--border)] bg-white"}`}>
                              <input
                                type="checkbox"
                                checked={item.position === pos}
                                disabled={disabled}
                                onChange={() => {
                                  if (!disabled) {
                                    updateBoardSectionEditor(item.client_id, { position: pos });
                                  }
                                }}
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1">노출 컨텐츠</div>
                      <div className="flex gap-2">
                        {(["recent", "best"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`flex-1 rounded-[5px] border px-3 py-1.5 text-sm ${item.content_mode === m ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--border)] bg-white"}`}
                            onClick={() => updateBoardSectionEditor(item.client_id, { content_mode: m })}
                          >
                            {m === "recent" ? "최근컨텐츠" : "베스트컨텐츠"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        className="w-24 rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-center text-sm"
                        type="number"
                        min={1}
                        value={item.item_limit}
                        onChange={(event) => updateBoardSectionEditor(item.client_id, { item_limit: Number(event.target.value) || 1 })}
                      />
                      <span className="text-sm text-[var(--ink)]">개 노출</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          onChange={(event) => updateBoardSectionEditor(item.client_id, { is_active: event.target.checked })}
                        />
                        활성 노출
                      </label>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[0.67rem] border border-dashed border-[var(--border)] bg-white px-6 py-10 text-center text-sm text-slate-500">
              등록된 게시판 노출이 없습니다. `+ 게시판노출 추가`를 눌러 생성하세요.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-[5px] border border-[var(--border)] bg-white px-8 py-2 text-sm font-normal text-[var(--ink)]"
            onClick={() => void handleSaveBoardSectionEditors()}
          >
            저장
          </button>
        </div>
      </section>
      ) : null}

      {mode === "filters" ? (
      <>
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-[#f4faf5] p-8 shadow-soft">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
          {topLevelCategories.map((category) => {
            const active = category.id === selectedCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                className={`rounded-[5px] border px-4 py-2 text-sm ${
                  active
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-[var(--border)] bg-white text-slate-700"
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                {category.name}
              </button>
            );
          })}
          {showTopCategoryInput ? (
            <>
              <input
                className="min-w-[180px] rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm"
                placeholder="새 카테고리명"
                value={pendingTopCategoryName}
                onChange={(event) => setPendingTopCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddTopCategory();
                  }
                }}
              />
              <button
                type="button"
                className="rounded-[5px] border border-[var(--brand)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void handleAddTopCategory()}
              >
                추가
              </button>
              <button
                type="button"
                className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm text-slate-600"
                onClick={() => {
                  setShowTopCategoryInput(false);
                  setPendingTopCategoryName("");
                }}
              >
                취소
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="rounded-[5px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
            onClick={() => {
              setShowTopCategoryInput(true);
              setError("");
            }}
          >
            +
          </button>
        </div>

        {selectedCategory ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-3 rounded-[0.67rem] border border-[var(--border)] bg-white p-5 md:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="카테고리명"
                value={selectedCategoryName}
                onChange={(event) => setSelectedCategoryName(event.target.value)}
              />
              <input
                className="rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm"
                placeholder="카테고리 설명"
                value={selectedCategoryDescription}
                onChange={(event) => setSelectedCategoryDescription(event.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-[5px] border border-[var(--border)] bg-white px-4 py-2 text-sm"
                  onClick={() => void handleSaveSelectedCategory()}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="rounded-[5px] border border-red-200 bg-white px-4 py-2 text-sm text-red-600"
                  onClick={() => void handleDeleteSelectedCategory()}
                >
                  삭제
                </button>
              </div>
            </div>

            <div className="rounded-[0.67rem] border border-[var(--border)] bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="min-w-[220px] flex-1 rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm"
                  placeholder="새 항목명 예: 브랜드"
                  value={pendingFilterName}
                  onChange={(event) => setPendingFilterName(event.target.value)}
                />
                <button
                  type="button"
                  className="rounded-[5px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                  onClick={() => void handleAddFilterField()}
                >
                  + 항목 추가
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {filtersForSelectedCategory.length > 0 ? (
                  filtersForSelectedCategory
                    .slice()
                    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
                    .map((filterItem) => (
                      <article key={filterItem.id} className="rounded-[5px] border border-[var(--border)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--ink)]">{filterItem.name}</p>
                          <button
                            type="button"
                            className="rounded-[5px] border border-red-200 px-3 py-1 text-xs text-red-600"
                            onClick={() => void handleDeleteFilterField(filterItem.id)}
                          >
                            항목 삭제
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <input
                            className="min-w-[220px] flex-1 rounded-[5px] border border-[var(--border)] px-3 py-2 text-sm"
                            placeholder="체크박스 값 추가"
                            value={pendingOptionLabelByFilter[filterItem.id] ?? ""}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleAddFilterOption(filterItem.id);
                              }
                            }}
                            onChange={(event) =>
                              setPendingOptionLabelByFilter((current) => ({
                                ...current,
                                [filterItem.id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm"
                            onClick={() => void handleAddFilterOption(filterItem.id)}
                          >
                            +
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {options
                            .filter((option) => Number(option.filter) === filterItem.id && option.is_active)
                            .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)
                            .map((option) => (
                              <label
                                key={option.id}
                                className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm"
                              >
                                <input type="checkbox" readOnly className="h-4 w-4" />
                                <span>{option.label}</span>
                                <button
                                  type="button"
                                  className="ml-1 rounded border border-red-200 px-1 text-xs text-red-600"
                                  onClick={() => void handleDeleteFilterOption(option.id)}
                                >
                                  x
                                </button>
                              </label>
                            ))}
                        </div>
                      </article>
                    ))
                ) : (
                  <p className="py-4 text-sm text-slate-500">아직 생성된 항목이 없습니다. 상단에서 `+ 항목 추가`를 눌러 시작하세요.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">상단 `+` 버튼으로 카테고리를 먼저 추가하세요.</p>
        )}
      </section>

      <section className="rounded-[0.67rem] border border-[var(--border)] bg-[#fffaf2] p-8 shadow-soft">
        <form className="grid gap-4 border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleProviderSubmit}>
          <h2 className="md:col-span-2 text-xl font-semibold">4. 외부 API / 크롤링 연동 소스</h2>
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="제공자명"
            value={providerForm.name}
            onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))}
          />
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="코드"
            value={providerForm.code}
            onChange={(event) => setProviderForm((current) => ({ ...current, code: event.target.value }))}
          />
          <select
            className="border border-[var(--border)] px-4 py-3"
            value={providerForm.provider_type}
            onChange={(event) => setProviderForm((current) => ({ ...current, provider_type: event.target.value }))}
          >
            <option value="api">공식 API</option>
            <option value="feed">데이터 피드</option>
            <option value="crawl">크롤링</option>
          </select>
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="기본 URL"
            value={providerForm.base_url}
            onChange={(event) => setProviderForm((current) => ({ ...current, base_url: event.target.value }))}
          />
          <input
            className="border border-[var(--border)] px-4 py-3 md:col-span-2"
            placeholder="키 관리 메모"
            value={providerForm.credentials_hint}
            onChange={(event) => setProviderForm((current) => ({ ...current, credentials_hint: event.target.value }))}
          />
          <button className="bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">제공자 등록</button>

          <select
            className="border border-[var(--border)] px-4 py-3"
            value={externalCategoryForm.provider}
            onChange={(event) => setExternalCategoryForm((current) => ({ ...current, provider: Number(event.target.value) }))}
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="외부 카테고리 ID"
            value={externalCategoryForm.external_id}
            onChange={(event) => setExternalCategoryForm((current) => ({ ...current, external_id: event.target.value }))}
          />
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="외부 카테고리명"
            value={externalCategoryForm.name}
            onChange={(event) => setExternalCategoryForm((current) => ({ ...current, name: event.target.value }))}
          />
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="전체 경로"
            value={externalCategoryForm.full_path}
            onChange={(event) => setExternalCategoryForm((current) => ({ ...current, full_path: event.target.value }))}
          />
          <button className="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white md:col-span-2" onClick={(event) => void handleExternalCategorySubmit(event as unknown as FormEvent<HTMLFormElement>)}>
            외부 카테고리 후보 등록
          </button>
        </form>
      </section>

      <section className="rounded-[0.67rem] border border-[var(--border)] bg-[#f5f7fb] p-8 shadow-soft">
        <h2 className="text-xl font-bold text-[var(--ink)]">상품필터 연동 매핑</h2>
        <p className="mt-2 text-sm text-slate-600">외부 연동 소스에서 가져온 항목을 상품필터(카테고리/체크항목)로 연결합니다.</p>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <form className="grid gap-4 border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleExternalAttributeSubmit}>
          <h2 className="md:col-span-2 text-xl font-semibold">5. 외부 속성 후보</h2>
          <select
            className="border border-[var(--border)] px-4 py-3"
            value={externalAttributeForm.category}
            onChange={(event) => setExternalAttributeForm((current) => ({ ...current, category: Number(event.target.value) }))}
          >
            {externalCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.provider_name} · {category.name}
              </option>
            ))}
          </select>
          <input
            className="border border-[var(--border)] px-4 py-3"
            placeholder="외부 속성 키"
            value={externalAttributeForm.external_key}
            onChange={(event) => setExternalAttributeForm((current) => ({ ...current, external_key: event.target.value }))}
          />
          <input
            className="border border-[var(--border)] px-4 py-3 md:col-span-2"
            placeholder="외부 속성명"
            value={externalAttributeForm.name}
            onChange={(event) => setExternalAttributeForm((current) => ({ ...current, name: event.target.value }))}
          />
          <button className="bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">외부 속성 후보 등록</button>
        </form>

        <form className="grid gap-4 border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleCategoryMappingSubmit}>
          <h2 className="md:col-span-2 text-xl font-semibold">6. 카테고리 승인 매핑</h2>
          <select
            className="border border-[var(--border)] px-4 py-3"
            value={categoryMappingForm.internal_category}
            onChange={(event) => setCategoryMappingForm((current) => ({ ...current, internal_category: Number(event.target.value) }))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="border border-[var(--border)] px-4 py-3"
            value={categoryMappingForm.external_category}
            onChange={(event) => setCategoryMappingForm((current) => ({ ...current, external_category: Number(event.target.value) }))}
          >
            {externalCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.provider_name} · {category.name}
              </option>
            ))}
          </select>
          <input
            className="border border-[var(--border)] px-4 py-3 md:col-span-2"
            placeholder="운영 메모"
            value={categoryMappingForm.note}
            onChange={(event) => setCategoryMappingForm((current) => ({ ...current, note: event.target.value }))}
          />
          <button className="bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">카테고리 매핑 저장</button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form className="grid gap-4 border border-[var(--border)] bg-white p-6 shadow-soft md:grid-cols-2" onSubmit={handleFilterMappingSubmit}>
          <h2 className="md:col-span-2 text-xl font-semibold">7. 필터 승인 매핑</h2>
          <select
            className="border border-[var(--border)] px-4 py-3"
            value={filterMappingForm.internal_filter}
            onChange={(event) => setFilterMappingForm((current) => ({ ...current, internal_filter: Number(event.target.value) }))}
          >
            {filters.map((filter) => (
              <option key={filter.id} value={filter.id}>
                {filter.name}
              </option>
            ))}
          </select>
          <select
            className="border border-[var(--border)] px-4 py-3"
            value={filterMappingForm.external_attribute}
            onChange={(event) => setFilterMappingForm((current) => ({ ...current, external_attribute: Number(event.target.value) }))}
          >
            {externalAttributes.map((attribute) => (
              <option key={attribute.id} value={attribute.id}>
                {attribute.provider_name} · {attribute.name}
              </option>
            ))}
          </select>
          <input
            className="border border-[var(--border)] px-4 py-3 md:col-span-2"
            placeholder="운영 메모"
            value={filterMappingForm.note}
            onChange={(event) => setFilterMappingForm((current) => ({ ...current, note: event.target.value }))}
          />
          <button className="bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">필터 매핑 저장</button>
        </form>

        <section className="border border-[var(--border)] bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold">최근 연결 현황</h2>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">카테고리 승인 매핑</p>
              <div className="mt-2 space-y-2">
                {categoryMappings.slice(0, 5).map((mapping) => (
                  <div key={mapping.id} className="border border-[var(--border)] px-4 py-3 text-sm">
                    <p className="font-semibold">{mapping.internal_category_name}</p>
                    <p className="mt-1 text-slate-600">{mapping.provider_name} · {mapping.external_category_name}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">필터 승인 매핑</p>
              <div className="mt-2 space-y-2">
                {filterMappings.slice(0, 5).map((mapping) => (
                  <div key={mapping.id} className="border border-[var(--border)] px-4 py-3 text-sm">
                    <p className="font-semibold">{mapping.internal_filter_name}</p>
                    <p className="mt-1 text-slate-600">{mapping.provider_name} · {mapping.external_attribute_name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      </section>
      </>
      ) : null}
    </div>
  );
}
