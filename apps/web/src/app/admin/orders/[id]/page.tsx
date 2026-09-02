import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { computeCardFee, computeMarginAmount, computeTotalCost } from "@/lib/margin";
import { getCourierTrackingUrl } from "@/lib/courierTracking";
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
  RETURN_REQUESTED: "반품요청",
  CANCELED: "취소됨",
};

const COURIER_OPTIONS = ["CJ대한통운", "우체국택배", "롯데택배", "로젠택배", "한진택배"];

export default async function AdminOrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;

  const [order, setting] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { shipment: true }, orderBy: { lineNo: "asc" } },
        payment: true,
        customer: true,
      },
    }),
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (!order) notFound();

  const cardFeePercent = setting?.cardFeePercent ?? 3.2;
  const cardFee = computeCardFee(order.totalAmount, order.payment?.method, cardFeePercent);
  const totalCost = computeTotalCost(order.items);
  const marginAmount = computeMarginAmount(order.totalAmount, order.payment?.method, cardFeePercent, totalCost);

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

      {order.status === "RETURN_REQUESTED" && (
        <section className="mb-8 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <h2 className="text-sm font-semibold text-red-700 mb-1">반품 요청</h2>
          <p className="text-red-600">{order.returnReason || "사유가 입력되지 않았습니다."}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">결제</h2>
        <p className="text-sm text-gray-600 mb-2">
          상태: {order.payment?.status === "DONE" ? "입금/결제 확인됨" : "미확인"}
          {order.payment?.method ? ` (${order.payment.method})` : ""}
        </p>
        <div className="text-sm space-y-1 mb-3 bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex justify-between text-gray-500">
            <span>결제금액</span>
            <span>{formatWon(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>카드수수료{cardFee > 0 ? ` (${cardFeePercent}%)` : ""}</span>
            <span>{cardFee > 0 ? `-${formatWon(cardFee)}` : "해당없음"}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>원가금액</span>
            <span>-{formatWon(totalCost)}</span>
          </div>
          <div className="flex justify-between font-semibold text-primary pt-1 border-t border-gray-200">
            <span>마진금액</span>
            <span>{formatWon(marginAmount)}</span>
          </div>
        </div>
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
        <p className="text-xs text-gray-400 mb-3">
          한 주문에 상품이 여러 개면 공급사가 상품별로 따로 출고해 운송장번호가 각각 다를 수
          있어, 상품마다 운송장을 따로 등록합니다.
        </p>

        <ul className="space-y-3 mb-3">
          {order.items.map((item) => {
            const trackingUrl = getCourierTrackingUrl(item.shipment?.courier, item.shipment?.trackingNumber);
            return (
            <li key={item.id} className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 mb-1">
                {item.productName} <span className="text-gray-400">· {item.optionName}</span>
              </p>
              {item.shipment?.trackingNumber ? (
                <p className="text-sm text-gray-600 mb-2">
                  {item.shipment.courier} · {item.shipment.trackingNumber} (
                  {item.shipment.status === "DELIVERED" ? "배송완료" : "배송중"})
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary hover:underline"
                    >
                      배송조회 →
                    </a>
                  )}
                </p>
              ) : (
                <p className="text-sm text-gray-400 mb-2">등록된 운송장이 없습니다.</p>
              )}
              <form action={saveShipmentAction} className="flex items-end gap-2 flex-wrap">
                <input type="hidden" name="orderItemId" value={item.id} />
                <div>
                  <label className="block text-xs text-gray-500 mb-1">택배사</label>
                  <select
                    name="courier"
                    defaultValue={item.shipment?.courier ?? ""}
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
                    defaultValue={item.shipment?.trackingNumber ?? ""}
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
            </li>
            );
          })}
        </ul>

        <div className="flex gap-2">
          <form action={markPreparingAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button type="submit" className="text-xs text-gray-500 hover:text-primary underline">
              배송준비중으로 변경
            </button>
          </form>
          {order.items.some((item) => item.shipment?.trackingNumber && item.shipment.status !== "DELIVERED") && (
            <form action={markDeliveredAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit" className="text-xs text-gray-500 hover:text-primary underline">
                전체 상품 배송완료로 변경
              </button>
            </form>
          )}
        </div>
      </section>

      {order.status !== "CANCELED" && (
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
