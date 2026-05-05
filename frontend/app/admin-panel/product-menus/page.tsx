"use client";

import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AdminMenuCategory,
  createAdminHotdealCategory,
  createAdminMarketplaceCategory,
  deleteAdminHotdealCategory,
  deleteAdminMarketplaceCategory,
  getAdminHotdealCategories,
  getAdminMarketplaceCategories,
  reorderAdminHotdealCategories,
  reorderAdminMarketplaceCategories,
  updateAdminHotdealCategory,
  updateAdminMarketplaceCategory,
} from "@/lib/api";
import { AlertCircle, GripVertical, RotateCcw, Save } from "lucide-react";

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        checked ? "border-emerald-500 bg-emerald-500/20" : "border-slate-300 bg-slate-200"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

const initialCategoryForm = {
  name: "",
  description: "",
  sort_order: 0,
  is_visible: true,
  menu_placement: undefined as AdminMenuCategory["menu_placement"] | undefined,
};

const placementLabel: Record<NonNullable<AdminMenuCategory["menu_placement"]>, string> = {
  sale: "상품판매",
  used: "중고상품",
  both: "상품판매 + 중고상품",
  hidden: "숨김",
};

const placementChoices: Array<{ value: NonNullable<AdminMenuCategory["menu_placement"]>; label: string }> = [
  { value: "sale", label: "상품판매" },
  { value: "used", label: "중고상품" },
  { value: "both", label: "상품판매 + 중고상품" },
  { value: "hidden", label: "숨김" },
];

export default function AdminProductMenusPage() {
  const router = useRouter();
  const [hotdealCategories, setHotdealCategories] = useState<AdminMenuCategory[]>([]);
  const [marketplaceCategories, setMarketplaceCategories] = useState<AdminMenuCategory[]>([]);
  const [hotdealCategoryForm, setHotdealCategoryForm] = useState(initialCategoryForm);
  const [marketplaceCategoryForm, setMarketplaceCategoryForm] = useState(initialCategoryForm);
  const [editingHotdealCategoryId, setEditingHotdealCategoryId] = useState<number | null>(null);
  const [editingMarketplaceCategoryId, setEditingMarketplaceCategoryId] = useState<number | null>(null);
  const [editingHotdealCategoryForm, setEditingHotdealCategoryForm] = useState<Partial<AdminMenuCategory>>({});
  const [editingMarketplaceCategoryForm, setEditingMarketplaceCategoryForm] = useState<Partial<AdminMenuCategory>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void loadMenuCategories();
  }, []);

  async function loadMenuCategories() {
    try {
      const [hotdealItems, marketplaceItems] = await Promise.all([getAdminHotdealCategories(), getAdminMarketplaceCategories()]);
      setHotdealCategories(hotdealItems);
      setMarketplaceCategories(marketplaceItems);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "메뉴 카테고리를 불러오지 못했습니다.");
    }
  }

  const notifyHotdealUpdate = () => {
    window.dispatchEvent(new Event("hotdeal:categories-updated"));
    window.localStorage.setItem("hotdeal:categories-updated", String(Date.now()));
    router.refresh();
  };

  const notifyMarketplaceUpdate = () => {
    window.dispatchEvent(new Event("marketplace:categories-updated"));
    window.localStorage.setItem("marketplace:categories-updated", String(Date.now()));
    router.refresh();
  };

  const handleCreateHotdealCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const created = await createAdminHotdealCategory(hotdealCategoryForm);
      setHotdealCategories((current) => [...current, created].sort((a, b) => a.sort_order - b.sort_order));
      setHotdealCategoryForm(initialCategoryForm);
      setNotice(`'${created.name}' 핫딜 메뉴를 생성했습니다.`);
      notifyHotdealUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "핫딜 메뉴 생성에 실패했습니다.");
    }
  };

  const handleCreateMarketplaceCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = { ...marketplaceCategoryForm, menu_placement: marketplaceCategoryForm.menu_placement ?? "both" };
    try {
      const created = await createAdminMarketplaceCategory(payload);
      setMarketplaceCategories((current) => [...current, created].sort((a, b) => a.sort_order - b.sort_order));
      setMarketplaceCategoryForm({ ...initialCategoryForm, menu_placement: "both" });
      setNotice(`'${created.name}' 중고장터 메뉴를 생성했습니다.`);
      notifyMarketplaceUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "중고장터 메뉴 생성에 실패했습니다.");
    }
  };

  const handleUpdateHotdealCategory = async (categoryId: number) => {
    try {
      const updated = await updateAdminHotdealCategory(categoryId, editingHotdealCategoryForm);
      setHotdealCategories((current) => current.map((item) => (item.id === categoryId ? updated : item)));
      setEditingHotdealCategoryId(null);
      setEditingHotdealCategoryForm({});
      setNotice(`'${updated.name}' 핫딜 메뉴를 수정했습니다.`);
      notifyHotdealUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "핫딜 메뉴 수정에 실패했습니다.");
    }
  };

  const handleUpdateMarketplaceCategory = async (categoryId: number) => {
    try {
      const updated = await updateAdminMarketplaceCategory(categoryId, {
        ...editingMarketplaceCategoryForm,
        menu_placement: editingMarketplaceCategoryForm.menu_placement ?? "both",
      });
      setMarketplaceCategories((current) => current.map((item) => (item.id === categoryId ? updated : item)));
      setEditingMarketplaceCategoryId(null);
      setEditingMarketplaceCategoryForm({});
      setNotice(`'${updated.name}' 중고장터 메뉴를 수정했습니다.`);
      notifyMarketplaceUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "중고장터 메뉴 수정에 실패했습니다.");
    }
  };

  const handleDeleteHotdealCategory = async (category: AdminMenuCategory) => {
    if (!window.confirm(`'${category.name}' 핫딜 메뉴를 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteAdminHotdealCategory(category.id);
      setHotdealCategories((current) => current.filter((item) => item.id !== category.id));
      setNotice(`'${category.name}' 핫딜 메뉴를 삭제했습니다.`);
      notifyHotdealUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "핫딜 메뉴 삭제에 실패했습니다.");
    }
  };

  const handleDeleteMarketplaceCategory = async (category: AdminMenuCategory) => {
    if (!window.confirm(`'${category.name}' 중고장터 메뉴를 삭제하시겠습니까?`)) {
      return;
    }
    try {
      await deleteAdminMarketplaceCategory(category.id);
      setMarketplaceCategories((current) => current.filter((item) => item.id !== category.id));
      setNotice(`'${category.name}' 중고장터 메뉴를 삭제했습니다.`);
      notifyMarketplaceUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "중고장터 메뉴 삭제에 실패했습니다.");
    }
  };

  const handleReorderHotdealCategories = async (order: number[]) => {
    try {
      await reorderAdminHotdealCategories(order);
      setNotice("핫딜 메뉴 순서를 저장했습니다.");
      notifyHotdealUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "핫딜 메뉴 순서 저장에 실패했습니다.");
      await loadMenuCategories();
    }
  };

  const handleReorderMarketplaceCategories = async (order: number[]) => {
    try {
      await reorderAdminMarketplaceCategories(order);
      setNotice("중고장터 메뉴 순서를 저장했습니다.");
      notifyMarketplaceUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "중고장터 메뉴 순서 저장에 실패했습니다.");
      await loadMenuCategories();
    }
  };

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      <CategoryManagerSection
        title="핫딜 좌측 메뉴 관리"
        description="핫딜 페이지 좌측 메뉴에 노출될 상품군을 관리합니다."
        items={hotdealCategories}
        form={hotdealCategoryForm}
        setForm={setHotdealCategoryForm}
        editingId={editingHotdealCategoryId}
        setEditingId={setEditingHotdealCategoryId}
        editingForm={editingHotdealCategoryForm}
        setEditingForm={setEditingHotdealCategoryForm}
        onCreate={handleCreateHotdealCategory}
        onSave={handleUpdateHotdealCategory}
        onDelete={handleDeleteHotdealCategory}
        onReorder={handleReorderHotdealCategories}
      />
      <CategoryManagerSection
        title="중고장터 좌측 메뉴 관리"
        description="중고장터 페이지 좌측 메뉴에 노출될 품목군을 관리합니다."
        items={marketplaceCategories}
        form={marketplaceCategoryForm}
        setForm={setMarketplaceCategoryForm}
        editingId={editingMarketplaceCategoryId}
        setEditingId={setEditingMarketplaceCategoryId}
        editingForm={editingMarketplaceCategoryForm}
        setEditingForm={setEditingMarketplaceCategoryForm}
        onCreate={handleCreateMarketplaceCategory}
        onSave={handleUpdateMarketplaceCategory}
        onDelete={handleDeleteMarketplaceCategory}
        onReorder={handleReorderMarketplaceCategories}
        showPlacement
      />
    </div>
  );
}

type CategoryManagerSectionProps = {
  title: string;
  description: string;
  items: AdminMenuCategory[];
  form: typeof initialCategoryForm;
  setForm: Dispatch<SetStateAction<typeof initialCategoryForm>>;
  editingId: number | null;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  editingForm: Partial<AdminMenuCategory>;
  setEditingForm: Dispatch<SetStateAction<Partial<AdminMenuCategory>>>;
  onCreate: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onSave: (categoryId: number) => Promise<void>;
  onDelete: (category: AdminMenuCategory) => Promise<void>;
  onReorder: (order: number[]) => Promise<void>;
  showPlacement?: boolean;
};

function CategoryManagerSection({
  title,
  description,
  items,
  form,
  setForm,
  editingId,
  setEditingId,
  editingForm,
  setEditingForm,
  onCreate,
  onSave,
  onDelete,
  onReorder,
  showPlacement = false,
}: CategoryManagerSectionProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const orderedItems = useMemo(
    () => [...items].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.id - right.id),
    [items]
  );
  const [localItems, setLocalItems] = useState<AdminMenuCategory[]>(orderedItems);

  useEffect(() => {
    setLocalItems(orderedItems);
  }, [orderedItems]);

  const isOrderDirty = useMemo(() => {
    return JSON.stringify(orderedItems.map(i => i.id)) !== JSON.stringify(localItems.map(i => i.id));
  }, [orderedItems, localItems]);

  const handleDragOver = (event: React.DragEvent, targetId: number) => {
    event.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    const newItems = [...localItems];
    const fromIndex = newItems.findIndex((item) => item.id === draggedId);
    const toIndex = newItems.findIndex((item) => item.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const [draggedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, draggedItem);
    setLocalItems(newItems);
  };

  const handleSaveOrder = async () => {
    const order = localItems.map((item) => item.id);
    await onReorder(order);
  };

  const handleCancelOrder = () => {
    setLocalItems(orderedItems);
  };

  return (
    <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
        <input className="rounded-[5px] border border-[var(--border)] px-4 py-3" placeholder="메뉴 이름" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <input className="rounded-[5px] border border-[var(--border)] px-4 py-3" type="number" placeholder="정렬 순서" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
        {showPlacement ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 ml-1">좌측메뉴 노출 위치</label>
            <select
              className="rounded-[5px] border border-[var(--border)] px-4 py-3"
              value={form.menu_placement ?? "both"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  menu_placement: event.target.value as NonNullable<AdminMenuCategory["menu_placement"]>,
                }))
              }
            >
              {placementChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <textarea className="rounded-[0.5rem] border border-[var(--border)] px-4 py-3 md:col-span-2" rows={3} placeholder="메뉴 설명" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        <label className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm md:col-span-2">
          <span>노출 상태로 생성</span>
          <ToggleSwitch checked={form.is_visible} onChange={() => setForm((current) => ({ ...current, is_visible: !current.is_visible }))} label="메뉴 노출 상태" />
        </label>
        <button className="rounded-[5px] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">메뉴 생성</button>
      </form>
      <div className="mt-8 border-t border-[var(--border)] pt-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">메뉴 목록 정렬</h3>
          {isOrderDirty ? (
            <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                type="button"
                onClick={handleCancelOrder}
                className="flex items-center gap-2 rounded-[5px] border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                정렬 취소
              </button>
              <button
                type="button"
                onClick={() => void handleSaveOrder()}
                className="flex items-center gap-2 rounded-[5px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Save className="h-4 w-4" />
                순서 저장하기
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <AlertCircle className="h-4 w-4" />
              <span>항목을 드래그하여 순서를 변경할 수 있습니다.</span>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          {localItems.map((item) => (
            <article
              key={item.id}
              draggable={true}
              onDragStart={(e) => {
                setDraggedId(item.id);
                e.dataTransfer.setData("text/plain", item.id.toString());
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                handleDragOver(e, item.id);
                setDragOverId(item.id);
              }}
              onDragLeave={() => setDragOverId(null)}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-[0.5rem] border p-5 transition-all duration-200 ${
                draggedId === item.id
                  ? "border-emerald-500 bg-emerald-50 opacity-50 ring-2 ring-emerald-500/20"
                  : dragOverId === item.id
                    ? "border-emerald-300 bg-emerald-50/50 shadow-md translate-y-[-2px]"
                    : "border-[var(--border)] bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div 
                  className="cursor-grab p-2 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
                  title="드래그하여 순서 변경"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      item.is_visible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {item.is_visible ? "Visible" : "Hidden"}
                    </p>
                    {showPlacement && item.menu_placement ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        {placementLabel[item.menu_placement]}
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-400">ID: {item.id} · Order: {item.sort_order}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-slate-800">{item.name}</h3>
                  {editingId === item.id ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 ml-1">메뉴 이름</label>
                        <input className="rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" value={editingForm.name ?? ""} onChange={(event) => setEditingForm((current) => ({ ...current, name: event.target.value }))} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 ml-1">정렬 순서 (저장 후 자동 갱신됨)</label>
                        <input className="rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" type="number" value={Number(editingForm.sort_order ?? 0)} disabled />
                      </div>
                      {showPlacement ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-slate-500 ml-1">좌측메뉴 노출 위치</label>
                          <select
                            className="rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            value={editingForm.menu_placement ?? "both"}
                            onChange={(event) =>
                              setEditingForm((current) => ({
                                ...current,
                                menu_placement: event.target.value as NonNullable<AdminMenuCategory["menu_placement"]>,
                              }))
                            }
                          >
                            {placementChoices.map((choice) => (
                              <option key={choice.value} value={choice.value}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-xs font-semibold text-slate-500 ml-1">메뉴 설명</label>
                        <textarea className="rounded-[0.5rem] border border-[var(--border)] px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" rows={2} value={editingForm.description ?? ""} onChange={(event) => setEditingForm((current) => ({ ...current, description: event.target.value }))} />
                      </div>
                      <label className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm md:col-span-2 hover:bg-slate-50 transition-colors">
                        <span className="font-medium">메뉴 노출 권장</span>
                        <ToggleSwitch checked={Boolean(editingForm.is_visible)} onChange={() => setEditingForm((current) => ({ ...current, is_visible: !Boolean(current.is_visible) }))} label="노출 상태" />
                      </label>
                    </div>
                  ) : item.description ? (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-1">{item.description}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {editingId === item.id ? (
                  <>
                    <button type="button" onClick={() => void onSave(item.id)} className="rounded-[5px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm">
                      저장
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-[5px] border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingForm({
                          name: item.name,
                          description: item.description,
                          sort_order: item.sort_order,
                          is_visible: item.is_visible,
                          menu_placement: item.menu_placement ?? "both",
                        });
                      }}
                      className="rounded-[5px] border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      수정
                    </button>
                    <button type="button" onClick={() => void onDelete(item)} className="rounded-[5px] border border-red-100 bg-red-50/30 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-200">
                      삭제
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
