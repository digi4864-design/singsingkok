import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@farm-mall/db";
import {
  refreshMembershipTier,
  markWelcomeCouponUsedIfApplicable,
  grantFirstPurchaseCouponIfApplicable,
  markFirstPurchaseCouponUsedIfApplicable,
} from "@/lib/updateMembership";
import { redeemPointsForOrder } from "@/lib/points";

function failRedirect(req: NextRequest, message: string) {
  const url = new URL("/checkout/fail", req.url);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

// 토스페이먼츠 결제위젯의 successUrl. 결제 요청이 성공하면 여기로 리다이렉트되며
// paymentKey/orderId(=우리 주문번호)/amount 쿼리 파라미터가 붙는다.
// 반드시 서버에서 금액을 재검증한 뒤 결제 승인 API를 호출해야 한다.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get("paymentKey");
  const orderNo = searchParams.get("orderId");
  const amountParam = searchParams.get("amount");

  if (!paymentKey || !orderNo || !amountParam) {
    return failRedirect(req, "잘못된 결제 요청입니다.");
  }

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { payment: true },
  });
  if (!order) {
    return failRedirect(req, "주문을 찾을 수 없습니다.");
  }
  if (order.totalAmount !== Number(amountParam)) {
    return failRedirect(req, "결제 금액이 주문 금액과 일치하지 않습니다.");
  }
  if (order.payment?.status === "DONE") {
    // 이미 승인된 결제(중복 콜백 등) - 그대로 주문 확인 페이지로 보낸다.
    return NextResponse.redirect(new URL(`/orders/${order.id}`, req.url));
  }

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return failRedirect(req, "결제 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.");
  }

  const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");
  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId: orderNo, amount: Number(amountParam) }),
  });
  const data = await tossRes.json();

  if (!tossRes.ok) {
    return failRedirect(req, data.message ?? "결제 승인에 실패했습니다.");
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { orderId: order.id },
      data: {
        paymentKey,
        method: data.method ?? "카드",
        status: "DONE",
        approvedAt: new Date(),
        rawResponse: data,
      },
    }),
    prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } }),
  ]);

  await refreshMembershipTier(order.customerId);
  await markWelcomeCouponUsedIfApplicable(order.customerId, order.couponApplied);
  await markFirstPurchaseCouponUsedIfApplicable(order.customerId, order.firstPurchaseCouponApplied);
  await grantFirstPurchaseCouponIfApplicable(order.customerId, order.id);
  await redeemPointsForOrder(prisma, order);

  return NextResponse.redirect(new URL(`/orders/${order.id}`, req.url));
}
