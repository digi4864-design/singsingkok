import type { MembershipTier } from "@farm-mall/db";

export interface TierInfo {
  tier: MembershipTier;
  label: string;
  emoji: string;
  minAmount: number; // 이 등급이 되기 위한 누적 구매금액 기준
  color: string; // 배지 텍스트/배경에 쓸 tailwind 색상 계열
  discountPercent: number; // 이 등급이 결제 시 자동으로 받는 할인율(%)
}

// 누적 구매금액(취소 제외) 기준 등급. 낮은 금액부터 순서대로 정렬돼 있어야 한다.
export const TIERS: TierInfo[] = [
  { tier: "SPROUT", label: "새싹", emoji: "🌱", minAmount: 0, color: "gray", discountPercent: 0 },
  { tier: "LEAF", label: "잎새", emoji: "🍃", minAmount: 100_000, color: "green", discountPercent: 2 },
  { tier: "FRUIT", label: "열매", emoji: "🍎", minAmount: 300_000, color: "amber", discountPercent: 3 },
  { tier: "GOLD", label: "황금열매", emoji: "🏆", minAmount: 700_000, color: "yellow", discountPercent: 5 },
];

// 첫구매 감사 쿠폰: 5,000원 정액 할인, 5만원 이상 주문 시에만 사용 가능(가입 시 1회 발급)
export const WELCOME_COUPON_AMOUNT = 5000;
export const WELCOME_COUPON_MIN_ORDER = 50_000;

export function getTierDiscountPercent(tier: MembershipTier): number {
  return getTierInfo(tier).discountPercent;
}

export function computeTier(totalSpent: number): MembershipTier {
  let result: MembershipTier = "SPROUT";
  for (const t of TIERS) {
    if (totalSpent >= t.minAmount) result = t.tier;
  }
  return result;
}

export function getTierInfo(tier: MembershipTier): TierInfo {
  return TIERS.find((t) => t.tier === tier) ?? TIERS[0];
}

// 다음 등급까지 얼마나 더 사야 하는지. 이미 최고 등급이면 null.
export function getNextTier(totalSpent: number): { info: TierInfo; remaining: number } | null {
  const next = TIERS.find((t) => totalSpent < t.minAmount);
  if (!next) return null;
  return { info: next, remaining: next.minAmount - totalSpent };
}
