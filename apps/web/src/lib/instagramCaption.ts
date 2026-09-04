import { getStorefrontName } from "@/lib/productDisplay";
import { formatWon } from "@/lib/format";

interface CaptionProduct {
  name: string;
  displayName: string | null;
  id: string;
}

// 관리자가 게시 전 자유롭게 수정할 수 있는 "초안" 문구. AI 호출 없이 규칙 기반으로 생성해
// 매번 결과가 달라지지 않고, 별도 API 비용도 들지 않는다.
export function buildDefaultCaption(product: CaptionProduct, minPrice: number | null, isNew: boolean): string {
  const name = getStorefrontName(product);
  const priceLine = minPrice != null ? `\n💰 ${formatWon(minPrice)}부터` : "";
  const badge = isNew ? "🆕 신상품 입고!" : "🌞 지금 추천드리는 상품";

  return `${badge}\n\n${name}${priceLine}\n\n산지에서 바로 받아보는 신선함, 싱싱콕에서 만나보세요 🥬\n👉 프로필 링크에서 확인하기\n\n#싱싱콕 #신선식품 #농산물 #산지직송`;
}
