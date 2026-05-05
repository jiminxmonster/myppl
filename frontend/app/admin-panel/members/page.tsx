"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminMember, authApi } from "@/lib/api";


export default function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [query, setQuery] = useState("");
  const [suspendUntilMap, setSuspendUntilMap] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    void loadMembers();
  }, []);

  async function loadMembers(search = "") {
    try {
      setMembers(await authApi.adminMembers(search));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "회원 목록을 불러오지 못했습니다.");
    }
  }

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadMembers(query);
  };

  const handleSuspendToggle = async (member: AdminMember) => {
    const updated = await authApi.suspendMember(member.id, {
      is_suspended: !member.is_suspended,
      suspend_until: member.is_suspended ? null : suspendUntilMap[member.id] || null,
      suspend_reason: member.is_suspended ? "" : "운영자 패널에서 수동 정지",
      suspend_public: member.is_suspended ? "" : "운영 정책 위반으로 일시 정지되었습니다.",
    });
    setMembers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">회원 관리</h1>
        <p className="mt-3 text-sm text-slate-600">닉네임, 이메일, 상태를 검색하고 정지 상태를 바로 제어할 수 있습니다.</p>
      </section>
      <form onSubmit={handleSearch} className="flex gap-3 rounded-[0.67rem] border border-[var(--border)] bg-white p-5 shadow-soft">
        <input className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3" placeholder="닉네임 또는 이메일 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white">검색</button>
      </form>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <section className="rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft">
        <div className="grid gap-4">
          {members.map((member) => (
            <article key={member.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[0.5rem] border border-[var(--border)] p-5">
              <div>
                <h2 className="text-lg font-bold">{member.nickname}</h2>
                <p className="mt-1 text-sm text-slate-600">{member.email} · 등급 {member.grade} · 운영권한 {member.operator_role}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {member.is_suspended ? "정지중" : "정상"} · 포인트 {member.points} · 누적 정지 {member.suspend_count}회
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  해제 예정 {member.suspend_until ? new Date(member.suspend_until).toLocaleString("ko-KR") : "미설정"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!member.is_suspended ? (
                  <input
                    type="datetime-local"
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                    value={suspendUntilMap[member.id] ?? ""}
                    onChange={(event) => setSuspendUntilMap((current) => ({ ...current, [member.id]: event.target.value }))}
                  />
                ) : null}
                <button type="button" onClick={() => void handleSuspendToggle(member)} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
                  {member.is_suspended ? "정지 해제" : "정지"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
