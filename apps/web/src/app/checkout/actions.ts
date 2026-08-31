"use server";

import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

export interface CheckoutItemInput {
  productOptionId: string;
  quantity: number;
}

export interface CheckoutInput {
  items: CheckoutItemInput[];
  recipientName: string;
  recipientPhone: string;
  zipCode: string;
  address: string;
  addressDetail?: string;
  memo?: string;
  paymentMethod: "CARD" | "BANK_TRANSFER";
}

export interface CheckoutResult {
  ok: boolean;
  message?: string;
  orderId?: string;
  orderNo?: string;
  totalAmount?: number;
}

function generateOrderNo(): string {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `ORD${stamp}${rand}`;
}

export async function createOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  if (input.items.length === 0) {
    return { ok: false, message: "장바구니가 비어 있습니다." };
  }
  if (!input.recipientName || !input.recipientPhone || !input.address) {
    return { ok: false, message: "받는 분 정보를 모두 입력해주세요." };
  }

  const optionIds = input.items.map((i) => i.productOptionId);
  const options = await prisma.productOption.findMany({
    where: { id: { in: optionIds } },
    include: { product: true },
  });

  const optionMap = new Map(options.map((o) => [o.id, o]));
  const lineItems = [];

  for (const item of input.items) {
    const option = optionMap.get(item.productOptionId);
    if (!option) return { ok: false, message: "존재하지 않는 상품 옵션이 포함되어 있습니다." };
    if (!option.isAvailable) {
      return { ok: false, message: `품절된 상품이 포함되어 있습니다: ${option.product.name}` };
    }
    lineItems.push({
      productOptionId: option.id,
      productName: option.product.name,
      optionName: option.optionName,
      unitPrice: option.sellingPrice,
      quantity: item.quantity,
      lineTotal: option.sellingPrice * item.quantity,
    });
  }

  const totalAmount = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const session = await auth();

  const order = await prisma.order.create({
    data: {
      orderNo: generateOrderNo(),
      customerId: session?.user?.id,
      totalAmount,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      zipCode: input.zipCode,
      address: input.address,
      addressDetail: input.addressDetail,
      memo: input.memo,
      items: { create: lineItems },
      payment: {
        // 카드/간편결제는 method를 미리 표시해, 주문 확인 페이지에서 무통장입금 안내와
        // 구분한다(무통장입금은 관리자가 입금 확인 시 method를 채운다).
        create: { amount: totalAmount, method: input.paymentMethod === "CARD" ? "토스페이먼츠" : null },
      },
    },
  });

  return { ok: true, orderId: order.id, orderNo: order.orderNo, totalAmount };
}
