import type { MembershipTier } from "@farm-mall/db";
import { getTierInfo } from "@/lib/membership";

const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  yellow: "bg-yellow-100 text-yellow-800",
};

export function TierBadge({ tier, className = "" }: { tier: MembershipTier; className?: string }) {
  const info = getTierInfo(tier);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${COLOR_CLASSES[info.color]} ${className}`}
    >
      {info.emoji} {info.label}
    </span>
  );
}
