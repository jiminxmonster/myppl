import type { Metadata } from "next";
import "./globals.css";

import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button";
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
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
          <SiteHeader />
          <main className="flex-1 py-8">{children}</main>
        </div>
        <ScrollToTopButton />
      </body>
    </html>
  );
}
