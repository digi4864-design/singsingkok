import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import {
  confirmPaymentAction,
  saveShipmentAction,
  markPreparingAction,
  markDeliveredAction,
  cancelOrderAction,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  CANCELED: "취소됨",
};

const COURIER_OPTIONS = ["CJ대한통운", "우체국택배", "롯데택배", "로젠택배", "한진택배"];

export default async function AdminOrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, shipment: true, customer: true },
  });

  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">주문 {order.orderNo}</h1>
        <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        주문일시: {order.createdAt.toLocaleString("ko-KR")}
      </p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">주문 상품</h2>
        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="py-3 flex justify-between">
              <div>
                <p className="text-gray-800">{item.productName}</p>
                <p className="text-xs text-gray-500">
                  {item.optionName} × {item.quantity}
                </p>
              </div>
              <p className="text-gray-900 font-medium">{formatWon(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between mt-3 text-base">
          <span className="text-gray-600">총 결제금액</span>
          <span className="font-bold text-gray-900">{formatWon(order.totalAmount)}</span>
        </div>
      </section>

      <section className="mb-8 text-sm text-gray-600 space-y-1">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">배송지</h2>
        <p>
          {order.recipientName} · {order.recipientPhone}
        </p>
        <p>
          ({order.zipCode}) {order.address} {order.addressDetail}
        </p>
        {order.memo && <p className="text-gray-400">요청사항: {order.memo}</p>}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">결제</h2>
        <p className="text-sm text-gray-600 mb-2">
          상태: {order.payment?.status === "DONE" ? "입금/결제 확인됨" : "미확인"}
          {order.payment?.method ? ` (${order.payment.method})` : ""}
        </p>
        {order.payment?.status !== "DONE" && (
          <form action={confirmPaymentAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button
              type="submit"
              className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover"
            >
              입금 확인 처리
            </button>
          </form>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">배송</h2>
        {order.shipment?.trackingNumber ? (
          <p className="text-sm text-gray-600 mb-3">
            {order.shipment.courier} · {order.shipment.trackingNumber} (
            {order.shipment.status === "DELIVERED" ? "배송완료" : "배송중"})
          </p>
        ) : (
          <p className="text-sm text-gray-400 mb-3">등록된 운송장이 없습니다.</p>
        )}

        <form action={saveShipmentAction} className="flex items-end gap-2 mb-3">
          <input type="hidden" name="orderId" value={order.id} />
          <div>
            <label className="block text-xs text-gray-500 mb-1">택배사</label>
            <select
              name="courier"
              defaultValue={order.shipment?.courier ?? ""}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
            >
              <option value="">선택</option>
              {COURIER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">운송장번호</label>
            <input
              name="trackingNumber"
              defaultValue={order.shipment?.trackingNumber ?? ""}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm w-48"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5"
          >
            운송장 등록
          </button>
        </form>

        <div className="flex gap-2">
          <form action={markPreparingAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="text-xs text-gray-500 hover:text-primary underline">
              배송준비중으로 변경
            </button>
          </form>
          {order.shipment?.trackingNumber && order.shipment.status !== "DELIVERED" && (
            <form action={markDeliveredAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit" className="text-xs text-gray-500 hover:text-primary underline">
                배송완료로 변경
              </button>
            </form>
          )}
        </div>
      </section>

      {order.status !== "CANCELED" && order.status !== "DELIVERED" && (
        <form action={cancelOrderAction}>
          <input type="hidden" name="orderId" value={order.id} />
          <button type="submit" className="text-xs text-red-400 hover:text-red-600 underline">
            주문 취소
          </button>
        </form>
      )}
    </div>
  );
}
