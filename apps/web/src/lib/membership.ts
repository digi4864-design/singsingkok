import type { MembershipTier } from "@farm-mall/db";

export interface TierInfo {
  tier: MembershipTier;
  label: string;
  emoji: string;
  minAmount: number; // 이 등급이 되기 위한 누적 구매금액 기준
  color: string; // 배지 텍스트/배경에 쓸 tailwind 색상 계열
}

// 누적 구매금액(취소 제외) 기준 등급. 낮은 금액부터 순서대로 정렬돼 있어야 한다.
export const TIERS: TierInfo[] = [
  { tier: "SPROUT", label: "새싹", emoji: "🌱", minAmount: 0, color: "gray" },
  { tier: "LEAF", label: "잎새", emoji: "🍃", minAmount: 100_000, color: "green" },
  { tier: "FRUIT", label: "열매", emoji: "🍎", minAmount: 300_000, color: "amber" },
  { tier: "GOLD", label: "황금열매", emoji: "🏆", minAmount: 700_000, color: "yellow" },
];

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
