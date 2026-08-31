const ICON_MAP: Record<string, string> = {
  과일: "🍎",
  국내과일: "🍎",
  수입과일: "🍊",
  농산물: "🥬",
  축산: "🥩",
  수산: "🐟",
  가공: "🥫",
  은하수산: "🦐",
  미지정: "📦",
};

export function categoryIcon(name: string): string {
  return ICON_MAP[name] ?? "🛒";
}
