"use server";

import { prisma } from "@farm-mall/db";

export interface LookupState {
  ok: boolean;
  message: string;
  orderId?: string;
}

export async function lookupOrderAction(
  _prev: LookupState,
  formData: FormData
): Promise<LookupState> {
  const orderNo = String(formData.get("orderNo") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();

  if (!orderNo || !recipientPhone) {
    return { ok: false, message: "주문번호와 연락처를 모두 입력해주세요." };
  }

  const order = await prisma.order.findFirst({
    where: { orderNo, recipientPhone },
    select: { id: true },
  });

  if (!order) {
    return { ok: false, message: "일치하는 주문을 찾을 수 없습니다. 주문번호와 연락처를 확인해주세요." };
  }

  return { ok: true, message: "", orderId: order.id };
}
