 "use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { AdminGuard } from "@/components/admin/admin-guard";

const dashboardItem = { href: "/admin-panel", label: "대시보드" };

const screenManagementItems = [
  { href: "/admin-panel/hero-sections", label: "히어로섹션" },
  { href: "/admin-panel/boards", label: "게시판관리" },
  { href: "/admin-panel/catalog", label: "상품순위노출" },
];

const policyManagementItems = [
  { href: "/admin-panel/contents", label: "상품승인관리" },
  { href: "/admin-panel/filter-settings", label: "상품필터설정" },
  { href: "/admin-panel/posts", label: "게시물관리" },
  { href: "/admin-panel/members", label: "회원 관리" },
  { href: "/admin-panel/reports", label: "신고 처리" },
  { href: "/admin-panel/keywords", label: "금칙어 관리" },
  { href: "/admin-panel/ip-ban", label: "IP 차단" },
  { href: "/admin-panel/logs", label: "운영 로그" },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderNavItems = () => (
    <nav className="space-y-5">
      <div className="space-y-2">
        <Link
          href={dashboardItem.href}
          onClick={() => setMobileMenuOpen(false)}
          className={`block rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${
            pathname === dashboardItem.href
              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
              : "border-[var(--border)] text-slate-700 hover:bg-[var(--muted)]"
          }`}
          aria-pressed={pathname === dashboardItem.href}
        >
          {dashboardItem.label}
        </Link>
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-bold tracking-wide text-slate-500">화면관리</p>
        {screenManagementItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`block rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${
              pathname === item.href
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : "border-[var(--border)] text-slate-700 hover:bg-[var(--muted)]"
            }`}
            aria-pressed={pathname === item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-bold tracking-wide text-slate-500">정책관리</p>
        {policyManagementItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`block rounded-[5px] border px-4 py-3 text-sm font-semibold transition ${
              pathname === item.href
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : "border-[var(--border)] text-slate-700 hover:bg-[var(--muted)]"
            }`}
            aria-pressed={pathname === item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );

  return (
    <AdminGuard>
      <div className="mb-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-[5px] border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-soft"
          aria-expanded={mobileMenuOpen}
          aria-controls="admin-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          메뉴
        </button>
      </div>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="메뉴 닫기"
          />
          <aside
            id="admin-mobile-menu"
            className="fixed inset-y-0 left-0 z-40 w-[280px] overflow-y-auto border-r border-[var(--border)] bg-white p-6 shadow-soft lg:hidden"
          >
            {renderNavItems()}
          </aside>
        </>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-[0.67rem] border border-[var(--border)] bg-white p-6 shadow-soft lg:block">{renderNavItems()}</aside>
        <div className="space-y-6">{children}</div>
      </section>
    </AdminGuard>
  );
}
