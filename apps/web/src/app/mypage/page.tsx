import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELED: "취소됨",
};

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">마이페이지</h1>
      <div className="flex items-center justify-between mb-8">
        <p className="text-sm text-gray-500">
          {session.user.name}
          {session.user.email ? ` (${session.user.email})` : ""}
        </p>
        <Link href="/mypage/profile" className="text-sm text-primary hover:underline">
          회원정보 수정
        </Link>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-2">주문 내역</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">주문 내역이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
          {orders.map((o) => (
            <li key={o.id} className="py-3">
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-800">
                    {o.items[0]?.productName}
                    {o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{o.createdAt.toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatWon(o.totalAmount)}</p>
                  <p className="text-xs text-gray-500">{STATUS_LABEL[o.status] ?? o.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
