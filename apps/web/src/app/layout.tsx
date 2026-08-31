import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import { CartBadge } from "@/components/CartBadge";
import { AuthHeader } from "@/components/AuthHeader";
import { PwaRegister } from "@/components/PwaRegister";
import { InstallPrompt } from "@/components/InstallPrompt";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { prisma } from "@farm-mall/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "싱싱콕",
  description: "신선한 농축산물을 산지에서 바로 받아보세요",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "싱싱콕",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#16803c",
};

// 루트 레이아웃이 DB(StoreSetting)를 조회하므로, 빌드 시 정적 프리렌더링을 시도하지 않도록 강제한다.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const setting = await prisma.storeSetting.findUnique({ where: { id: "default" } });
  const hasBusinessInfo = Boolean(setting?.businessName && setting?.businessRegistrationNo);

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PwaRegister />
        <CartProvider>
          <InstallPrompt />
          <header className="border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="inline-block active:scale-95 transition-transform">
                <Logo />
              </Link>
              <nav className="flex items-center gap-4 text-sm text-gray-500">
                <Link href="/wishlist" className="hidden sm:inline hover:text-primary">
                  찜
                </Link>
                <AuthHeader />
                <span className="text-gray-300">|</span>
                <CartBadge />
              </nav>
            </div>
          </header>
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
          <footer className="border-t border-gray-200 mt-16">
            <div className="max-w-6xl mx-auto px-4 py-8 text-xs text-gray-400 space-y-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>싱싱콕 · 문의: {setting?.contactPhone ?? "준비 중"}</span>
                <span className="text-gray-300">|</span>
                <Link href="/orders/lookup" className="hover:text-primary">
                  비회원 주문조회
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/terms" className="hover:text-primary">
                  이용약관
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/privacy" className="hover:text-primary">
                  개인정보처리방침
                </Link>
              </div>
              {hasBusinessInfo ? (
                <p className="leading-relaxed">
                  {setting!.businessName} · 대표 {setting!.representativeName} · 사업자등록번호{" "}
                  {setting!.businessRegistrationNo}
                  {setting!.mailOrderSalesNo ? ` · 통신판매업신고 ${setting!.mailOrderSalesNo}` : ""}
                  {setting!.businessAddress ? ` · ${setting!.businessAddress}` : ""}
                </p>
              ) : (
                <p>사업자 정보 등록 예정</p>
              )}
            </div>
          </footer>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
