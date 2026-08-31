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
