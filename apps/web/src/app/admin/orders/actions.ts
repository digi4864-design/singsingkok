"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { refreshMembershipTier, markWelcomeCouponUsedIfApplicable } from "@/lib/updateMembership";

export async function confirmPaymentAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  const [, order] = await prisma.$transaction([
    prisma.payment.update({
      where: { orderId },
      data: { status: "DONE", approvedAt: new Date(), method: "무통장입금(수동확인)" },
    }),
    prisma.order.update({ where: { id: orderId }, data: { status: "PAID" } }),
  ]);

  await refreshMembershipTier(order.customerId);
  await markWelcomeCouponUsedIfApplicable(order.customerId, order.couponApplied);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function saveShipmentAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const courier = String(formData.get("courier") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();

  if (!courier || !trackingNumber) {
    throw new Error("택배사와 운송장번호를 입력해주세요.");
  }

  await prisma.shipment.upsert({
    where: { orderId },
    update: { courier, trackingNumber, status: "REGISTERED", invoiceRegisteredAt: new Date() },
    create: {
      orderId,
      courier,
      trackingNumber,
      status: "REGISTERED",
      invoiceRegisteredAt: new Date(),
    },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPING" } });

  revalidatePath(`/admin/orders/${orderId}`);
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

export async function markDeliveredAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));

  await prisma.shipment.update({
    where: { orderId },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function cancelOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const order = await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELED" } });
  // 취소된 주문은 누적 구매금액에서 빠져야 하므로 등급도 다시 계산한다.
  await refreshMembershipTier(order.customerId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
