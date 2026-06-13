import Link from "next/link";
import { ChevronDown, Instagram, Mail, MessageCircle, Youtube } from "lucide-react";

const quickLinks = [
  { label: "서비스 소개", href: "/" },
  { label: "상품게시판", href: "/boards/seller-hot-issues" },
  { label: "문의하기", href: "/boards/buyer-community" },
  { label: "광고 안내", href: "/marketplace/sell" },
];

const communityLinks = [
  { label: "판매자공유핫이슈", href: "/boards/seller-hot-issues" },
  { label: "구매자공유핫이슈", href: "/boards/구매자-공유-핫이슈" },
  { label: "커뮤니티", href: "/boards/buyer-community" },
  { label: "공지", href: "/boards/notice" },
];

const supportLinks = [
  { label: "이용 약관", href: "/boards/notice" },
  { label: "개인정보 처리방침", href: "/boards/notice" },
  { label: "자주 묻는 질문", href: "/boards/buyer-community" },
  { label: "제휴 문의", href: "/boards/seller-hot-issues" },
];

export function SiteFooter() {
  return (
    <footer className="rounded-[0.67rem] border border-[var(--border)] bg-white px-6 py-10 shadow-soft backdrop-blur sm:px-8 lg:px-12">
      <div className="grid gap-8 md:grid-cols-[1.35fr_0.85fr_1fr_1fr_1fr] lg:gap-10">
        <div className="max-w-xl">
          <Link href="/" className="inline-flex items-center">
            <img src="/branding/ppl_b.svg" alt="myppl" className="h-auto w-[90px] max-w-full" />
          </Link>
          <p className="mt-5 max-w-lg break-keep text-sm leading-7 text-slate-600">
            MYPPL은 판매자와 소비자가 좋은 상품 정보를 공유하고, 합리적인 홍보와 발견을 연결하는 커뮤니티형 상품 플랫폼입니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { label: "instagram", icon: Instagram },
              { label: "youtube", icon: Youtube },
              { label: "message", icon: MessageCircle },
              { label: "mail", icon: Mail },
            ].map(({ label, icon: Icon }) => (
              <Link
                key={label}
                href="/boards/buyer-community"
                aria-label={label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--border)] bg-white text-slate-600 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <Icon className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:block" aria-hidden="true" />

        <nav aria-label="빠른 링크" className="md:pt-[67px]">
          <h2 className="text-base font-bold text-[var(--ink)]">빠른 링크</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-[var(--brand)]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="커뮤니티" className="md:pt-[67px]">
          <h2 className="text-base font-bold text-[var(--ink)]">커뮤니티</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {communityLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-[var(--brand)]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="고객 지원" className="md:pt-[67px]">
          <h2 className="text-base font-bold text-[var(--ink)]">고객 지원</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {supportLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-[var(--brand)]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-10 flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© 2026 MYPPL. All rights reserved.</p>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-[5px] border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          한국어
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </footer>
  );
}
