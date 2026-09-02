"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

async function requireOwnOrder(orderId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("로그인이 필요합니다.");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== session.user.id) {
    throw new Error("주문을 찾을 수 없습니다.");
  }
  return order;
}

// 고객이 택배 수령 후 "배송완료"로 직접 변경 = 구매확정을 겸한다.
export async function confirmDeliveryAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  const order = await requireOwnOrder(orderId);

  if (order.status !== "SHIPPING") {
    throw new Error("배송중 상태의 주문만 구매확정할 수 있습니다.");
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "DELIVERED" } }),
    prisma.shipment.updateMany({
      where: { orderItem: { orderId } },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    }),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/mypage");
}

export interface ReturnRequestState {
  ok: boolean;
  message: string;
}

export async function requestReturnAction(
  _prev: ReturnRequestState,
  formData: FormData
): Promise<ReturnRequestState> {
  const orderId = String(formData.get("orderId"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    return { ok: false, message: "반품 사유를 입력해주세요." };
  }

  let order;
  try {
    order = await requireOwnOrder(orderId);
  } catch {
    return { ok: false, message: "주문을 찾을 수 없습니다." };
  }

  // 택배를 받은 시점(배송중)부터 반품/교환을 요청할 수 있다 - 반품 사유가 있는 경우
  // 굳이 먼저 "구매확정"을 거치도록 강제할 필요가 없다.
  if (order.status !== "SHIPPING" && order.status !== "DELIVERED") {
    return { ok: false, message: "배송중 또는 배송완료 상태의 주문만 반품/교환 요청할 수 있습니다." };
  }

  const wasShipping = order.status === "SHIPPING";

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "RETURN_REQUESTED", returnReason: reason },
    }),
    // 배송완료를 거치지 않고 배송중 상태에서 바로 반품 요청한 경우에만 수령 시점을 기록한다
    // (이미 구매확정을 거쳤다면 그때의 deliveredAt을 덮어쓰지 않는다).
    ...(wasShipping
      ? [
          prisma.shipment.updateMany({
            where: { orderItem: { orderId } },
            data: { status: "DELIVERED" as const, deliveredAt: new Date() },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/mypage");

  return { ok: true, message: "반품/교환 요청이 접수되었습니다." };
}
