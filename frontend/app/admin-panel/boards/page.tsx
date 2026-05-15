"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Check, RotateCcw } from "lucide-react";
import axios from "axios";

import type { AdminBoard, BoardWriterRole } from "@/lib/api";
import { createAdminBoard, deleteAdminBoard, getAdminBoards, reorderAdminBoards, updateAdminBoard } from "@/lib/api";

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
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}


const writerRoleOptions: { value: BoardWriterRole; label: string }[] = [
  { value: "all", label: "모두" },
  { value: "seller", label: "판매자" },
  { value: "buyer", label: "구매자" },
  { value: "admin", label: "관리자" },
];

const writerRoleLabelMap = writerRoleOptions.reduce<Record<BoardWriterRole, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {} as Record<BoardWriterRole, string>);

function normalizeWriterRoles(roles?: BoardWriterRole[] | null): BoardWriterRole[] {
  if (!roles || roles.length === 0 || roles.includes("all")) {
    return ["all"];
  }
  return writerRoleOptions
    .map((option) => option.value)
    .filter((role) => role !== "all" && roles.includes(role));
}

function toggleWriterRole(roles: BoardWriterRole[] | undefined, role: BoardWriterRole): BoardWriterRole[] {
  const current = normalizeWriterRoles(roles);
  if (role === "all") {
    return ["all"];
  }

  const withoutAll = current.filter((item) => item !== "all");
  const next = withoutAll.includes(role) ? withoutAll.filter((item) => item !== role) : [...withoutAll, role];
  return next.length > 0 ? next : ["all"];
}

function WriterRoleCheckboxes({
  value,
  onChange,
}: {
  value?: BoardWriterRole[] | null;
  onChange: (next: BoardWriterRole[]) => void;
}) {
  const selected = normalizeWriterRoles(value);
  return (
    <div className="rounded-[5px] border border-[var(--border)] p-4 md:col-span-2">
      <p className="text-sm font-semibold text-slate-800">글쓰기 허용 대상</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {writerRoleOptions.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-[5px] border px-3 py-2 text-sm font-semibold transition ${
                checked
                  ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                  : "border-[var(--border)] text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand)]"
                checked={checked}
                onChange={() => onChange(toggleWriterRole(selected, option.value))}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}

const initialForm: Omit<AdminBoard, "id" | "slug" | "post_count"> = {
  name: "",
  board_type: "general",
  product_board_type: "standard",
  parent: null as number | null,
  audience: "all",
  description: "",
  icon: "",
  sort_order: 0,
  is_visible: true,
  show_in_top_menu: false,
  min_grade: "seed",
  write_grade: "member",
  allowed_writer_roles: ["all"],
  comment_grade: "member",
  read_permission: "public",
  allow_anonymous: true,
  allow_anonymous_post: false,
  allow_file_upload: true,
  use_category: false,
};

export default function AdminBoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<AdminBoard[]>([]);
  const [localBoards, setLocalBoards] = useState<AdminBoard[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<Partial<AdminBoard>>({});
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isOrderDirty = JSON.stringify(boards.map(b => b.id)) !== JSON.stringify(localBoards.map(b => b.id));

  useEffect(() => {
    void loadBoards();
  }, []);

  async function loadBoards() {
    try {
      const fetched = await getAdminBoards();
      setBoards(fetched);
      setLocalBoards(fetched);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "게시판 목록을 불러오지 못했습니다.");
    }
  }

  const notifyBoardUpdate = () => {
    window.dispatchEvent(new Event("community:boards-updated"));
    window.localStorage.setItem("community:boards-updated", String(Date.now()));
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const created = await createAdminBoard(form);
      setBoards((current) => [...current, created].sort((a, b) => a.sort_order - b.sort_order));
      setForm(initialForm);
      setNotice(`'${created.name}' 게시판을 생성했습니다.`);
      notifyBoardUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "게시판 생성에 실패했습니다.");
    }
  };

  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (event: React.DragEvent, targetId: number) => {
    event.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    const newBoards = [...localBoards];
    const fromIndex = newBoards.findIndex((b) => b.id === draggedId);
    const toIndex = newBoards.findIndex((b) => b.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const [draggedItem] = newBoards.splice(fromIndex, 1);
    newBoards.splice(toIndex, 0, draggedItem);
    setLocalBoards(newBoards);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleSaveOrder = async () => {
    setError("");
    setNotice("");
    try {
      const order = localBoards.map((board) => board.id);
      await reorderAdminBoards(order);
      await loadBoards();
      setNotice("게시판 순서가 저장되었습니다.");
      notifyBoardUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "순서 저장에 실패했습니다.");
    }
  };

  const handleCancelOrder = () => {
    setLocalBoards([...boards]);
    setError("");
    setNotice("");
  };

  const handleDelete = async (board: AdminBoard) => {
    const confirmed = window.confirm(`'${board.name}' 게시판을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminBoard(board.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));
      setError("");
      setNotice(`'${board.name}' 게시판을 삭제했습니다.`);
      notifyBoardUpdate();
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 403) {
        const postCount = Number(requestError.response.data?.post_count ?? 0);
        const forceConfirmed = window.confirm(
          `'${board.name}' 게시판에 게시글 ${postCount}개가 있습니다. 게시글까지 함께 삭제하고 진행할까요?`
        );
        if (forceConfirmed) {
          try {
            await deleteAdminBoard(board.id, true);
            setBoards((current) => current.filter((item) => item.id !== board.id));
            setError("");
            setNotice(`'${board.name}' 게시판과 내부 게시글을 함께 삭제했습니다.`);
            notifyBoardUpdate();
            return;
          } catch (forceError) {
            setError(forceError instanceof Error ? forceError.message : "게시판 강제 삭제에 실패했습니다.");
            setNotice("");
            return;
          }
        }
        setError("게시글이 있는 게시판은 바로 삭제할 수 없습니다. 강제 삭제를 선택하거나 숨김 처리로 관리하세요.");
        setNotice("");
        return;
      }

      setError(requestError instanceof Error ? requestError.message : "게시판 삭제에 실패했습니다.");
      setNotice("");
    }
  };

  const startEdit = (board: AdminBoard) => {
    setEditingBoardId(board.id);
    setEditingForm({
      name: board.name,
      parent: (board as AdminBoard & { parent?: number | null }).parent ?? null,
      board_type: board.board_type,
      product_board_type: board.product_board_type ?? "standard",
      audience: (board as AdminBoard & { audience?: string }).audience ?? "all",
      description: board.description,
      is_visible: board.is_visible,
      show_in_top_menu: (board as AdminBoard & { show_in_top_menu?: boolean }).show_in_top_menu ?? false,
      min_grade: board.min_grade,
      write_grade: board.write_grade,
      allowed_writer_roles: normalizeWriterRoles(board.allowed_writer_roles),
      comment_grade: board.comment_grade,
      read_permission: board.read_permission,
      allow_anonymous: board.allow_anonymous,
      allow_anonymous_post: board.allow_anonymous_post,
      allow_file_upload: board.allow_file_upload,
      use_category: board.use_category,
    });
  };

  const handleUpdate = async (boardId: number) => {
    try {
      const updated = await updateAdminBoard(boardId, editingForm);
      setBoards((current) => current.map((board) => (board.id === boardId ? updated : board)));
      setEditingBoardId(null);
      setEditingForm({});
      setError("");
      setNotice(`'${updated.name}' 게시판을 수정했습니다.`);
      notifyBoardUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "게시판 수정에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-bold">게시판 / 그리드형 게시판 관리</h2>
        <p className="mt-2 text-sm text-slate-600">일반 게시판과 상품/라이브특가 그리드형 게시판을 생성하고 상단 메뉴 노출을 관리합니다.</p>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <input className="rounded-2xl border border-[var(--border)] px-4 py-3" placeholder="게시판 이름" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <select
            className="rounded-2xl border border-[var(--border)] px-4 py-3"
            value={form.board_type}
            onChange={(event) => setForm((current) => ({ ...current, board_type: event.target.value }))}
          >
            <option value="general">일반 게시판</option>
            <option value="product">그리드형 상품게시판</option>
            <option value="hotdeal">핫딜 게시판</option>
            <option value="marketplace">중고장터 게시판</option>
            <option value="notice">공지</option>
          </select>
          {form.board_type === "product" ? (
            <select
              className="rounded-2xl border border-[var(--border)] px-4 py-3"
              value={form.product_board_type ?? "standard"}
              onChange={(event) =>
                setForm((current) => ({ ...current, product_board_type: event.target.value as "standard" | "live_special" }))
              }
            >
              <option value="standard">일반 상품</option>
              <option value="live_special">라이브특가</option>
            </select>
          ) : null}
          <select
            className="rounded-2xl border border-[var(--border)] px-4 py-3"
            value={form.parent ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, parent: event.target.value ? Number(event.target.value) : null }))}
          >
            <option value="">상위 게시판 없음</option>
            {boards
              .filter((board) => board.board_type === "general" && !(board as AdminBoard & { parent?: number | null }).parent)
              .map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
          </select>
          <select
            className="rounded-2xl border border-[var(--border)] px-4 py-3"
            value={form.audience}
            onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as "all" | "buyer" | "seller" }))}
          >
            <option value="all">공통</option>
            <option value="buyer">구매자</option>
            <option value="seller">판매자</option>
          </select>
          <WriterRoleCheckboxes
            value={form.allowed_writer_roles}
            onChange={(next) => setForm((current) => ({ ...current, allowed_writer_roles: next }))}
          />
          <textarea className="rounded-[0.5rem] border border-[var(--border)] px-4 py-3 md:col-span-2" rows={3} placeholder="게시판 설명" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <label className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm md:col-span-2">
            <span>탑 메뉴에 노출</span>
            <ToggleSwitch
              checked={Boolean(form.show_in_top_menu)}
              onChange={() => setForm((current) => ({ ...current, show_in_top_menu: !current.show_in_top_menu }))}
              label="탑 메뉴 노출"
            />
          </label>
          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700 md:col-span-2">{notice}</p> : null}
          <button className="rounded-[5px] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-2">게시판 생성</button>
        </form>

        <div className="mt-8 border-t border-[var(--border)] pt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">목록 정렬/순서 관리</h3>
            {isOrderDirty ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  className="inline-flex items-center gap-2 rounded-[5px] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-soft"
                >
                  <Check className="h-4 w-4" />
                  순서 저장하기
                </button>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3">
            {localBoards
              .map((board, index) => (
                <article
                  key={board.id}
                  draggable
                  onDragStart={() => handleDragStart(board.id)}
                  onDragOver={(e) => handleDragOver(e, board.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-[0.5rem] border bg-white p-5 transition-all ${
                    draggedId === board.id
                      ? "border-[var(--brand)] opacity-50 shadow-lg"
                      : "border-[var(--border)] shadow-soft hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 cursor-grab text-slate-400 active:cursor-grabbing hover:text-slate-600">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand)]">
                        {board.board_type === "product" && board.product_board_type === "live_special"
                          ? "product · live"
                          : board.board_type}
                      </p>
                      <h2 className="mt-1 text-lg font-bold">{board.name}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        slug: {board.slug} · 게시글 {board.post_count}개 · 순서 {index + 1}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                        <span
                          className={`rounded-[3px] px-2 py-0.5 ${
                            board.is_visible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {board.is_visible ? "Visible" : "Hidden"}
                        </span>
                        <span
                          className={`rounded-[3px] px-2 py-0.5 ${
                            board.show_in_top_menu ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {board.show_in_top_menu ? "In Menu" : "Not In Menu"}
                        </span>
                        <span className="rounded-[3px] bg-amber-100 px-2 py-0.5 text-amber-700">
                          글쓰기 {normalizeWriterRoles(board.allowed_writer_roles).map((role) => writerRoleLabelMap[role]).join(", ")}
                        </span>
                      </div>
                      {editingBoardId === board.id ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <input className="rounded-2xl border border-[var(--border)] px-4 py-3" value={editingForm.name ?? ""} onChange={(event) => setEditingForm((current) => ({ ...current, name: event.target.value }))} />
                          <select
                            className="rounded-2xl border border-[var(--border)] px-4 py-3"
                            value={(editingForm.board_type as string | undefined) ?? board.board_type}
                            onChange={(event) => setEditingForm((current) => ({ ...current, board_type: event.target.value }))}
                          >
                            <option value="general">일반 게시판</option>
                            <option value="product">그리드형 상품게시판</option>
                            <option value="hotdeal">핫딜 게시판</option>
                            <option value="marketplace">중고장터 게시판</option>
                            <option value="notice">공지</option>
                          </select>
                          {((editingForm.board_type as string | undefined) ?? board.board_type) === "product" ? (
                            <select
                              className="rounded-2xl border border-[var(--border)] px-4 py-3"
                              value={(editingForm.product_board_type as string | undefined) ?? board.product_board_type ?? "standard"}
                              onChange={(event) =>
                                setEditingForm((current) => ({
                                  ...current,
                                  product_board_type: event.target.value as "standard" | "live_special",
                                }))
                              }
                            >
                              <option value="standard">일반 상품</option>
                              <option value="live_special">라이브특가</option>
                            </select>
                          ) : null}
                          <select
                            className="rounded-2xl border border-[var(--border)] px-4 py-3"
                            value={(editingForm.parent as number | null | undefined) ?? ""}
                            onChange={(event) => setEditingForm((current) => ({ ...current, parent: event.target.value ? Number(event.target.value) : null }))}
                          >
                            <option value="">상위 게시판 없음</option>
                            {boards
                              .filter((candidate) => candidate.id !== board.id && candidate.board_type === "general" && !(candidate as AdminBoard & { parent?: number | null }).parent)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                          </select>
                          <select
                            className="rounded-2xl border border-[var(--border)] px-4 py-3"
                            value={(editingForm.audience as string | undefined) ?? "all"}
                            onChange={(event) => setEditingForm((current) => ({ ...current, audience: event.target.value as "all" | "buyer" | "seller" }))}
                          >
                            <option value="all">공통</option>
                            <option value="buyer">구매자</option>
                            <option value="seller">판매자</option>
                          </select>
                          <WriterRoleCheckboxes
                            value={(editingForm.allowed_writer_roles as BoardWriterRole[] | undefined) ?? board.allowed_writer_roles}
                            onChange={(next) => setEditingForm((current) => ({ ...current, allowed_writer_roles: next }))}
                          />
                          <input className="rounded-2xl border border-[var(--border)] px-4 py-3 md:col-span-2" value={editingForm.description ?? ""} onChange={(event) => setEditingForm((current) => ({ ...current, description: event.target.value }))} />
                          <label className="flex items-center justify-between gap-3 rounded-[5px] border border-[var(--border)] px-4 py-3 text-sm md:col-span-2">
                            <span>탑 메뉴에 노출</span>
                            <ToggleSwitch
                              checked={Boolean(editingForm.show_in_top_menu)}
                              onChange={() => setEditingForm((current) => ({ ...current, show_in_top_menu: !Boolean(current.show_in_top_menu) }))}
                              label="탑 메뉴 노출"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingBoardId === board.id ? (
                      <>
                        <button type="button" onClick={() => void handleUpdate(board.id)} className="rounded-[5px] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
                          저장
                        </button>
                        <button type="button" onClick={() => setEditingBoardId(null)} className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                          취소
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEdit(board)} className="rounded-[5px] border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                        수정
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(board)}
                      className="rounded-[5px] border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
