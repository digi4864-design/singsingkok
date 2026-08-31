import Link from "next/link";
import { auth } from "@/lib/auth";

export async function BottomNav() {
  const session = await auth();

  const items = [
    { href: "/", label: "홈", icon: "🏠" },
    // 로그인 상태면 본인 주문 목록(마이페이지)으로, 비회원이면 주문번호로 조회하는
    // 비회원 주문조회 페이지로 보낸다.
    { href: session?.user ? "/mypage" : "/orders/lookup", label: "배송조회", icon: "📦" },
    { href: session?.user ? "/mypage" : "/login", label: session?.user ? "마이페이지" : "로그인", icon: "👤" },
    { href: "/?focus=search", label: "검색", icon: "🔍" },
    { href: "/wishlist", label: "찜", icon: "♡" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex items-stretch">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-gray-500 hover:text-primary active:bg-gray-100 transition-colors"
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[11px]">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
