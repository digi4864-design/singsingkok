import { prisma } from "@farm-mall/db";
import { computeTier } from "./membership";

// 취소되지 않은(=실제로 판매가 이뤄진) 주문만 누적 구매금액에 반영한다.
const COUNTED_STATUSES = ["PAID", "PREPARING", "SHIPPING", "DELIVERED"] as const;

// 주문이 결제 확정될 때마다(무통장입금 수동확인 / 카드결제 승인) 호출해서
// 회원의 누적 구매금액과 등급을 다시 계산한다. 비회원 주문(customerId 없음)은 건너뛴다.
export async function refreshMembershipTier(customerId: string | null | undefined) {
  if (!customerId) return;

  const result = await prisma.order.aggregate({
    where: { customerId, status: { in: [...COUNTED_STATUSES] } },
    _sum: { totalAmount: true },
  });
  const totalSpent = result._sum.totalAmount ?? 0;
  const membershipTier = computeTier(totalSpent);

  await prisma.user.update({
    where: { id: customerId },
    data: { totalSpent, membershipTier },
  });
}

// 결제가 실제로 확정된 주문에 신규가입 쿠폰이 적용돼 있었다면, 그때 비로소 "사용됨"으로
// 확정한다(주문만 생성되고 결제되지 않은 채 방치되는 경우 쿠폰을 낭비하지 않기 위함).
export async function markWelcomeCouponUsedIfApplicable(
  customerId: string | null | undefined,
  couponApplied: boolean
) {
  if (!customerId || !couponApplied) return;
  await prisma.user.update({ where: { id: customerId }, data: { welcomeCouponUsed: true } });
}

// 결제 확정 시(무통장입금 수동확인 / 카드결제 승인) 이번이 이 고객의 "실제로 확정된" 첫
// 주문이면, 다음 구매부터 쓸 수 있는 첫구매 감사 쿠폰(5,000원)을 지급한다. 회원가입 시가
// 아니라 첫 결제가 실제로 확정된 시점에 지급해, 결제 안 하고 방치된 주문으로는 지급되지
// 않는다.
export async function grantFirstPurchaseCouponIfApplicable(
  customerId: string | null | undefined,
  currentOrderId: string
) {
  if (!customerId) return;

  const priorConfirmedOrders = await prisma.order.count({
    where: { customerId, status: { in: [...COUNTED_STATUSES] }, id: { not: currentOrderId } },
  });
  if (priorConfirmedOrders > 0) return; // 이미 이전에 결제 확정된 주문이 있음 = 첫구매가 아님

  await prisma.user.update({ where: { id: customerId }, data: { hasFirstPurchaseCoupon: true } });
}

export async function markFirstPurchaseCouponUsedIfApplicable(
  customerId: string | null | undefined,
  applied: boolean
) {
  if (!customerId || !applied) return;
  await prisma.user.update({ where: { id: customerId }, data: { firstPurchaseCouponUsed: true } });
}
