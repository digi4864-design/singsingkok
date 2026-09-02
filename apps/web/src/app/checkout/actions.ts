"use server";

import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";
import { getTierDiscountPercent, WELCOME_COUPON_AMOUNT, WELCOME_COUPON_MIN_ORDER } from "@/lib/membership";
import { getStorefrontName } from "@/lib/productDisplay";

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
  useCoupon?: boolean;
  pointsUsed?: number;
  saveAddress?: boolean;
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
    const productDisplayName = getStorefrontName(option.product);
    if (!option.isAvailable) {
      return { ok: false, message: `품절된 상품이 포함되어 있습니다: ${productDisplayName}` };
    }
    lineItems.push({
      productOptionId: option.id,
      productName: productDisplayName,
      optionName: option.optionName,
      unitPrice: option.sellingPrice,
      unitCost: option.price, // 원가(공급가) 스냅샷 - 이후 공급가가 바뀌어도 이 주문의 마진은 그대로 유지됨
      quantity: item.quantity,
      lineTotal: option.sellingPrice * item.quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const session = await auth();

  // 등급 할인 + 신규가입 쿠폰 할인 + 포인트 사용은 반드시 서버에서 다시 확인한다(클라이언트가
  // 보낸 값은 신뢰하지 않음). 로그인하지 않았거나 쿠폰을 이미 썼다면 적용되지 않는다.
  let tierDiscountPercent = 0;
  let couponApplied = false;
  let pointsUsed = 0;
  if (session?.user) {
    const customer = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (customer) {
      tierDiscountPercent = getTierDiscountPercent(customer.membershipTier);
      const couponEligible =
        customer.hasWelcomeCoupon && !customer.welcomeCouponUsed && subtotal >= WELCOME_COUPON_MIN_ORDER;
      couponApplied = Boolean(input.useCoupon && couponEligible);
      pointsUsed = Math.max(0, Math.min(Math.floor(input.pointsUsed ?? 0), customer.points));
    }
  }
  const tierDiscountAmount = Math.round((subtotal * tierDiscountPercent) / 100 / 10) * 10;
  const discountAmount = tierDiscountAmount + (couponApplied ? WELCOME_COUPON_AMOUNT : 0);
  // 포인트는 할인 적용 후 남은 금액을 넘어 사용할 수 없다(결제금액이 음수가 되지 않도록).
  pointsUsed = Math.min(pointsUsed, subtotal - discountAmount);
  const totalAmount = subtotal - discountAmount - pointsUsed;

  const order = await prisma.order.create({
    data: {
      orderNo: generateOrderNo(),
      customerId: session?.user?.id,
      subtotal,
      discountAmount,
      couponApplied,
      pointsUsed,
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

  if (input.saveAddress && session?.user) {
    const existingCount = await prisma.address.count({ where: { userId: session.user.id } });
    await prisma.address.create({
      data: {
        userId: session.user.id,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        zipCode: input.zipCode,
        address: input.address,
        addressDetail: input.addressDetail,
        isDefault: existingCount === 0,
      },
    });
  }

  return { ok: true, orderId: order.id, orderNo: order.orderNo, totalAmount };
}
