import { prisma, Prisma, type PointTransactionType } from "@farm-mall/db";
import { REFERRAL_BONUS_POINTS } from "./points-constants";

export { REFERRAL_BONUS_POINTS, REFERRAL_COOKIE_NAME } from "./points-constants";

type Db = Prisma.TransactionClient | typeof prisma;

async function creditPoints(
  db: Db,
  userId: string,
  amount: number,
  type: PointTransactionType,
  orderId?: string
) {
  await db.user.update({ where: { id: userId }, data: { points: { increment: amount } } });
  await db.pointTransaction.create({ data: { userId, amount, type, orderId } });
}

// 가입 폼에 담긴 추천인 회원 id(ref)가 유효하면 추천인과 신규가입자 모두에게 1,000점씩 지급한다.
// 잘못된/존재하지 않는/자기 자신 id는 조용히 무시한다(가입 자체는 정상 진행되어야 하므로).
export async function awardReferralBonusIfApplicable(newUserId: string, ref: string | null | undefined) {
  const referrerId = (ref ?? "").trim();
  if (!referrerId || referrerId === newUserId) return;

  const referrer = await prisma.user.findUnique({ where: { id: referrerId }, select: { id: true } });
  if (!referrer) return;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: newUserId }, data: { referredById: referrerId } });
    await creditPoints(tx, newUserId, REFERRAL_BONUS_POINTS, "REFERRED_SIGNUP_BONUS");
    await creditPoints(tx, referrerId, REFERRAL_BONUS_POINTS, "REFERRAL_BONUS");
  });
}

// 결제가 확정된 시점(무통장입금 수동확인 / 카드결제 승인)에 주문에 걸어둔 포인트 사용분을
// 실제로 잔액에서 차감한다. 주문 생성 시점이 아니라 결제 확정 시점에 차감하는 이유는
// 결제되지 않고 방치되는 주문 때문에 포인트가 낭비되지 않도록 하기 위함(쿠폰과 동일한 패턴).
export async function redeemPointsForOrder(
  db: Db,
  order: { id: string; customerId: string | null; pointsUsed: number }
) {
  if (!order.customerId || order.pointsUsed <= 0) return;
  await creditPoints(db, order.customerId, -order.pointsUsed, "ORDER_REDEMPTION", order.id);
}

// 이미 결제 확정되어 포인트가 차감된 주문이 이후 취소되면, 사용했던 포인트를 되돌려준다.
export async function refundPointsForOrder(
  db: Db,
  order: { id: string; customerId: string | null; pointsUsed: number }
) {
  if (!order.customerId || order.pointsUsed <= 0) return;
  await creditPoints(db, order.customerId, order.pointsUsed, "ORDER_REFUND", order.id);
}

export const REVIEW_REWARD_POINTS = 500;

// 리뷰를 처음 작성하면 지급하는 보상 포인트(수정 시에는 지급하지 않음 - 호출부에서 최초
// 작성 여부를 확인한 뒤에만 호출한다).
export async function creditReviewReward(userId: string, _productId: string) {
  await creditPoints(prisma, userId, REVIEW_REWARD_POINTS, "REVIEW_REWARD");
}
