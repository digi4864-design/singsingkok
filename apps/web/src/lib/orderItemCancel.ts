import { prisma } from "@farm-mall/db";
import { refreshMembershipTier } from "@/lib/updateMembership";
import { refundPointsForOrder } from "@/lib/points";
import { cancelTossPayment } from "@/lib/tossPayment";

export interface CancelOrderItemResult {
  ok: boolean;
  message?: string;
}

// 한 주문에 상품이 여러 개일 때 상품 하나만 부분취소한다(관리자 화면과 고객 셀프취소가
// 함께 쓴다). 남아있는(취소 안 된) 상품들의 lineTotal 비율로 현재 남은
// order.totalAmount를 나눠 이 상품 몫을 계산해 그만큼만 토스에 부분취소 요청한다.
// 마지막 남은 상품을 취소하는 경우엔 반올림 오차가 남지 않도록 남은 금액 전부를
// 환불하고, 주문 전체를 취소 처리한다(전체취소와 동일한 결과).
export async function cancelOrderItem(orderItemId: string, cancelReason: string): Promise<CancelOrderItemResult> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      orderId: true,
      lineTotal: true,
      canceledAt: true,
      order: {
        select: {
          status: true,
          totalAmount: true,
          customerId: true,
          pointsUsed: true,
          payment: { select: { paymentKey: true, status: true } },
          items: { select: { id: true, lineTotal: true, canceledAt: true } },
        },
      },
    },
  });

  if (!item) return { ok: false, message: "주문 상품을 찾을 수 없습니다." };
  if (item.canceledAt) return { ok: false, message: "이미 취소된 상품입니다." };
  if (item.order.status === "CANCELED") return { ok: false, message: "이미 취소된 주문입니다." };

  const activeItems = item.order.items.filter((i) => !i.canceledAt);
  const isLastActiveItem = activeItems.length <= 1;
  const activeSubtotal = activeItems.reduce((sum, i) => sum + i.lineTotal, 0);

  const cancelAmount = isLastActiveItem
    ? item.order.totalAmount
    : Math.min(
        Math.round((item.lineTotal / activeSubtotal) * item.order.totalAmount),
        item.order.totalAmount
      );

  const payment = item.order.payment;
  if (cancelAmount > 0 && payment?.paymentKey && payment.status === "DONE") {
    const result = await cancelTossPayment(payment.paymentKey, cancelReason, cancelAmount);
    if (!result.ok) {
      return { ok: false, message: result.message ?? "결제 취소 처리 중 문제가 발생했습니다." };
    }
  }

  await prisma.$transaction([
    prisma.orderItem.update({
      where: { id: item.id },
      data: { canceledAt: new Date(), canceledAmount: cancelAmount },
    }),
    prisma.order.update({
      where: { id: item.orderId },
      data: {
        totalAmount: { decrement: cancelAmount },
        ...(isLastActiveItem ? { status: "CANCELED" as const } : {}),
      },
    }),
    ...(isLastActiveItem
      ? [prisma.payment.updateMany({ where: { orderId: item.orderId }, data: { status: "CANCELED" as const } })]
      : []),
  ]);

  await refreshMembershipTier(item.order.customerId);
  if (isLastActiveItem) {
    await refundPointsForOrder(prisma, {
      id: item.orderId,
      customerId: item.order.customerId,
      pointsUsed: item.order.pointsUsed,
    });
  }

  return { ok: true };
}
