import type { Metadata } from "next";
import "./globals.css";

import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "myppl",
  description: "딜과 커뮤니티를 연결하는 통합 플랫폼",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <AuthBootstrap />
        <div className="flex min-h-screen flex-col py-6">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <SiteHeader />
          </div>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <SiteFooter />
          </div>
        </div>
        <ScrollToTopButton />
      </body>
    </html>
  );
}
