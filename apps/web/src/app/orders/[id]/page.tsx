import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";
import { getCourierTrackingUrl } from "@/lib/courierTracking";
import { auth } from "@/lib/auth";
import { OrderActions } from "./OrderActions";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  RETURN_REQUESTED: "반품요청",
  CANCELED: "취소됨",
};

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  READY: "배송 준비 중",
  REGISTERED: "운송장 등록됨",
  IN_TRANSIT: "배송 중",
  DELIVERED: "배송 완료",
};

export default async function OrderConfirmationPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;

  const [order, setting, session] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { productOption: { select: { productId: true } }, shipment: true },
          orderBy: { lineNo: "asc" },
        },
        payment: true,
      },
    }),
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    auth(),
  ]);

  if (!order) notFound();

  const isBankTransferPending = order.status === "PENDING_PAYMENT" && !order.payment?.method;
  const isCardPaymentIncomplete = order.status === "PENDING_PAYMENT" && !!order.payment?.method;
  const shippedItems = order.items.filter((item) => item.shipment && item.shipment.status !== "READY");
  const isOwner = Boolean(session?.user && session.user.id === order.customerId);

  const productIdsInOrder = [...new Set(order.items.map((item) => item.productOption.productId))];
  const reviewedIds =
    isOwner && session?.user
      ? new Set(
          (
            await prisma.review.findMany({
              where: { userId: session.user.id, productId: { in: productIdsInOrder } },
              select: { productId: true },
            })
          ).map((r) => r.productId)
        )
      : new Set<string>();

  const reviewLinks = isOwner
    ? Array.from(
        new Map(
          order.items.map((item) => [item.productOption.productId, item.productName])
        ).entries()
      ).map(([productId, productName]) => ({
        productId,
        productName,
        reviewed: reviewedIds.has(productId),
      }))
    : [];

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <ClearCartOnMount />
      <h1 className="text-xl font-bold text-gray-900 mb-1">주문이 접수되었습니다</h1>
      <p className="text-sm text-gray-500 mb-6">주문번호 {order.orderNo}</p>

      <div className="mb-6">
        <span className="px-2.5 py-1 rounded-full text-xs bg-amber-50 text-amber-700">
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {isBankTransferPending && setting?.bankName && setting?.bankAccountNumber && (
        <div className="mb-6 rounded-lg bg-amber-50 text-amber-700 text-sm px-3 py-2">
          <p className="font-medium">
            {setting.bankName} {setting.bankAccountNumber} (예금주: {setting.bankAccountHolder})
          </p>
          <p className="text-xs mt-1">위 계좌로 입금해주시면 확인 후 배송이 진행됩니다.</p>
        </div>
      )}

      {isCardPaymentIncomplete && (
        <div className="mb-6 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
          <p className="font-medium">결제가 완료되지 않았습니다.</p>
          <p className="text-xs mt-1">
            결제가 취소되었거나 처리 중 문제가 발생했습니다. 다시 주문해주세요.
          </p>
        </div>
      )}

      <ul className="divide-y divide-gray-200 border-t border-b border-gray-200 text-sm mb-6">
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

      <div className="mb-8 space-y-1 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>상품금액</span>
          <span>{formatWon(order.subtotal)}</span>
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-primary">
            <span>할인{order.couponApplied ? " (등급+쿠폰)" : " (등급)"}</span>
            <span>-{formatWon(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base pt-1 border-t border-gray-100">
          <span className="text-gray-600">총 결제금액</span>
          <span className="font-bold text-gray-900">{formatWon(order.totalAmount)}</span>
        </div>
      </div>

      {shippedItems.length > 0 && (
        <section className="mb-8 rounded-lg bg-green-50 text-green-800 text-sm px-3 py-3 space-y-3">
          <h2 className="text-sm font-semibold">배송 정보</h2>
          {shippedItems.map((item) => {
            const trackingUrl = getCourierTrackingUrl(item.shipment!.courier, item.shipment!.trackingNumber);
            return (
              <div key={item.id} className="space-y-0.5">
                <p className="text-xs text-green-700">{item.productName}</p>
                <p>{SHIPMENT_STATUS_LABEL[item.shipment!.status] ?? item.shipment!.status}</p>
                {item.shipment!.courier && item.shipment!.trackingNumber && (
                  <p className="text-xs">
                    {item.shipment!.courier} · 운송장번호 {item.shipment!.trackingNumber}
                  </p>
                )}
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs font-medium text-green-800 underline underline-offset-2 active:opacity-70"
                  >
                    배송조회하기 →
                  </a>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="text-sm text-gray-600 space-y-1 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">배송지</h2>
        <p>
          {order.recipientName} · {order.recipientPhone}
        </p>
        <p>
          ({order.zipCode}) {order.address} {order.addressDetail}
        </p>
      </section>

      {isOwner && (
        <OrderActions
          orderId={order.id}
          status={order.status}
          returnReason={order.returnReason}
          reviewLinks={reviewLinks}
        />
      )}

      <Link href="/" className="text-primary hover:underline text-sm">
        쇼핑 계속하기 →
      </Link>
    </main>
  );
}
