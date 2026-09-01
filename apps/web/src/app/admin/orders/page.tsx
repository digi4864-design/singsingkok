import Link from "next/link";
import { prisma, OrderStatus } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { computeCardFee, computeMarginAmount } from "@/lib/margin";

export const dynamic = "force-dynamic";

const STATUS_TABS: { value?: string; label: string }[] = [
  { value: undefined, label: "전체" },
  { value: "PENDING_PAYMENT", label: "결제대기" },
  { value: "PAID", label: "결제완료" },
  { value: "PREPARING", label: "배송준비중" },
  { value: "SHIPPING", label: "배송중" },
  { value: "DELIVERED", label: "배송완료" },
  { value: "CANCELED", label: "취소" },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELED: "취소됨",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  PAID: "bg-blue-50 text-blue-700",
  PREPARING: "bg-indigo-50 text-indigo-700",
  SHIPPING: "bg-purple-50 text-purple-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELED: "bg-gray-100 text-gray-500",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const [orders, setting] = await Promise.all([
    prisma.order.findMany({
      where: status ? { status: status as OrderStatus } : undefined,
      include: { items: true, shipment: true, payment: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
  ]);
  const cardFeePercent = setting?.cardFeePercent ?? 3.2;

  // 취소된 주문은 실제 매출이 아니므로 합계에서 제외한다.
  const liveOrders = orders.filter((o) => o.status !== "CANCELED");
  const totalRevenue = liveOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCardFee = liveOrders.reduce(
    (sum, o) => sum + computeCardFee(o.totalAmount, o.payment?.method, cardFeePercent),
    0
  );
  const totalMargin = totalRevenue - totalCardFee;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">주문/배송 관리</h1>
        <div className="flex gap-2">
          <a
            href="/admin/orders/export"
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:border-primary"
          >
            결제완료 주문 엑셀 내보내기 (최고집 발주용)
          </a>
          <Link
            href="/admin/orders/import-tracking"
            className="px-3 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5"
          >
            송장 엑셀 일괄 등록
          </Link>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/orders?status=${tab.value}` : "/admin/orders"}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              status === tab.value
                ? "bg-primary text-white border-primary"
                : "border-gray-300 text-gray-600 hover:border-primary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="rounded-lg border border-gray-200 px-4 py-2.5">
          <p className="text-xs text-gray-400">결제금액 합계 (취소 제외)</p>
          <p className="text-base font-bold text-gray-900">{formatWon(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-2.5">
          <p className="text-xs text-gray-400">카드수수료 합계 ({cardFeePercent}%)</p>
          <p className="text-base font-bold text-red-500">-{formatWon(totalCardFee)}</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <p className="text-xs text-primary">마진금액 합계</p>
          <p className="text-base font-bold text-primary">{formatWon(totalMargin)}</p>
        </div>
      </div>

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">주문번호</th>
            <th className="text-left px-4 py-2 font-medium">받는 분</th>
            <th className="text-left px-4 py-2 font-medium">상품</th>
            <th className="text-left px-4 py-2 font-medium">금액</th>
            <th className="text-left px-4 py-2 font-medium">카드수수료</th>
            <th className="text-left px-4 py-2 font-medium">마진금액</th>
            <th className="text-left px-4 py-2 font-medium">상태</th>
            <th className="text-left px-4 py-2 font-medium">주문일시</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                주문이 없습니다.
              </td>
            </tr>
          )}
          {orders.map((o) => {
            const cardFee = computeCardFee(o.totalAmount, o.payment?.method, cardFeePercent);
            const margin = o.totalAmount - cardFee;
            return (
            <tr key={o.id} className={o.status === "CANCELED" ? "opacity-50" : undefined}>
              <td className="px-4 py-2">
                <Link href={`/admin/orders/${o.id}`} className="hover:text-primary">
                  {o.orderNo}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-600">{o.recipientName}</td>
              <td className="px-4 py-2 text-gray-500">
                {o.items[0]?.productName}
                {o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ""}
              </td>
              <td className="px-4 py-2">{formatWon(o.totalAmount)}</td>
              <td className="px-4 py-2 text-gray-500">
                {cardFee > 0 ? `-${formatWon(cardFee)}` : "-"}
              </td>
              <td className="px-4 py-2 font-medium text-primary">{formatWon(margin)}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[o.status]}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {o.createdAt.toLocaleString("ko-KR")}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
