import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/orders", label: "주문/배송 관리" },
  { href: "/admin/customers", label: "회원 관리" },
  { href: "/admin/products", label: "상품 관리" },
  { href: "/admin/products/import", label: "엑셀 업로드" },
  { href: "/admin/categories", label: "카테고리 관리" },
  { href: "/admin/reviews", label: "리뷰 관리" },
  { href: "/admin/instagram", label: "인스타그램 게시" },
  { href: "/admin/pricing", label: "가격/마진 설정" },
  { href: "/admin/settings", label: "쇼핑몰 설정" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-8">
      <aside className="w-44 shrink-0">
        <p className="text-xs font-semibold text-gray-400 mb-3 px-2">관리자</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
