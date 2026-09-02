"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { refreshMembershipTier, markWelcomeCouponUsedIfApplicable } from "@/lib/updateMembership";
import { redeemPointsForOrder, refundPointsForOrder } from "@/lib/points";

export async function confirmPaymentAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  const existing = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (existing?.status === "PAID") return; // 중복 클릭 등으로 포인트가 두 번 차감되지 않도록 방지

  const [, order] = await prisma.$transaction([
    prisma.payment.update({
      where: { orderId },
      data: { status: "DONE", approvedAt: new Date(), method: "무통장입금(수동확인)" },
    }),
    prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } }),
  ]);

  await refreshMembershipTier(order.customerId);
  await markWelcomeCouponUsedIfApplicable(order.customerId, order.couponApplied);
  await redeemPointsForOrder(prisma, order);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// 주문상품(orderItem) 하나의 운송장을 등록한다. 한 주문에 상품이 여러 개면 공급사가
// 상품별로 따로 출고해 운송장번호가 각각 다르므로, 주문 단위가 아니라 상품 단위로 등록한다.
export async function saveShipmentAction(formData: FormData) {
  await requireAdmin();
  const orderItemId = String(formData.get("orderItemId"));
  const courier = String(formData.get("courier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  if (!courier || !trackingNumber) {
    throw new Error("택배사와 운송장번호를 입력해주세요.");
  }

  const item = await prisma.orderItem.findUniqueOrThrow({
    where: { id: orderItemId },
    select: { orderId: true },
  });

  await prisma.shipment.upsert({
    where: { orderItemId },
    update: { courier, trackingNumber, status: "REGISTERED", invoiceRegisteredAt: new Date() },
    create: {
      orderItemId,
      courier,
      trackingNumber,
      status: "REGISTERED",
      invoiceRegisteredAt: new Date(),
    },
  });
  // 상품 중 하나라도 운송장이 등록되면 배송중으로 바꾼다(전부 도착해야 고객이 구매확정한다).
  await prisma.order.updateMany({
    where: { id: item.orderId, status: { in: ["PAID", "PREPARING"] } },
    data: { status: "SHIPPING" },
  });

  revalidatePath(`/admin/orders/${item.orderId}`);
  revalidatePath("/admin/orders");
}

export async function markPreparingAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  await prisma.order.update({ where: { id: orderId }, data: { status: "PREPARING" } });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// 결제완료 목록에서 여러 건을 한 번에 배송준비중으로 바꾼다. 실수로 다른 상태의 주문이
// 섞여 체크되어도 PAID 상태인 것만 반영되도록 서버에서 다시 한번 필터링한다.
export async function bulkMarkPreparingAction(formData: FormData) {
  await requireAdmin();
  const orderIds = formData.getAll("orderIds").map(String).filter(Boolean);
  if (orderIds.length === 0) return;

  await prisma.order.updateMany({
    where: { id: { in: orderIds }, status: "PAID" },
    data: { status: "PREPARING" },
  });

  revalidatePath("/admin/orders");
}

// 상품마다 운송장이 따로 있을 수 있으므로, 주문 전체를 배송완료로 바꿀 때는 등록된
// 모든 상품의 배송 상태를 한 번에 배송완료로 맞춘다.
export async function markDeliveredAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  await prisma.shipment.updateMany({
    where: { orderItem: { orderId } },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function cancelOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  const before = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  const wasPaid = before?.status !== "PENDING_PAYMENT" && before?.status !== "CANCELED";

  const order = await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELED" } });
  // 취소된 주문은 누적 구매금액에서 빠져야 하므로 등급도 다시 계산한다.
  await refreshMembershipTier(order.customerId);
  // 결제 확정(포인트 차감) 이후 취소된 주문이라면 사용했던 포인트를 되돌려준다.
  if (wasPaid) {
    await refundPointsForOrder(prisma, order);
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// 결제대기 목록에서 여러 건을 한 번에 취소한다. 실수로 다른 상태의 주문이 섞여 체크되어도
// PENDING_PAYMENT 상태인 것만 반영되도록 서버에서 다시 한번 필터링한다.
export async function bulkCancelPendingAction(formData: FormData) {
  await requireAdmin();
  const orderIds = formData.getAll("orderIds").map(String).filter(Boolean);
  if (orderIds.length === 0) return;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, status: "PENDING_PAYMENT" },
    select: { id: true, customerId: true },
  });
  if (orders.length === 0) return;

  await prisma.order.updateMany({
    where: { id: { in: orders.map((o) => o.id) } },
    data: { status: "CANCELED" },
  });

  const customerIds = [...new Set(orders.map((o) => o.customerId).filter((id): id is string => Boolean(id)))];
  await Promise.all(customerIds.map((id) => refreshMembershipTier(id)));

  revalidatePath("/admin/orders");
}
