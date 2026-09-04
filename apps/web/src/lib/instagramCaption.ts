import { getStorefrontName } from "@/lib/productDisplay";
import { formatWon } from "@/lib/format";
import { getFruitCareTip } from "@/lib/fruitCareTips";
import { getVegetableRecipeTip } from "@/lib/vegetableRecipeTips";

interface CaptionProduct {
  id: string;
  name: string;
  displayName: string | null;
}

const BASE_HASHTAGS = [
  "싱싱콕",
  "신선식품",
  "농산물",
  "산지직송",
  "신선배송",
  "장보기",
  "먹스타그램",
  "오늘의식탁",
  "제철음식",
  "건강한식탁",
  "농산물쇼핑몰",
  "냉장직송",
  "오늘뭐먹지",
  "국내산농산물",
  "신선한하루",
];

// 해시태그에 못 쓰는 문자(공백/특수문자)를 제거해 안전한 토큰으로 만든다.
function toHashtagToken(text: string): string {
  return text.replace(/[^\p{L}\p{N}]/gu, "");
}

export function buildHashtags(product: CaptionProduct): string[] {
  const name = getStorefrontName(product);
  const fullTag = toHashtagToken(name);
  const firstWordTag = toHashtagToken(name.split(/\s+/)[0] ?? "");

  const tags = new Set<string>();
  if (fullTag) tags.add(fullTag);
  if (firstWordTag && firstWordTag !== fullTag) tags.add(firstWordTag);
  for (const t of BASE_HASHTAGS) tags.add(t);

  return [...tags].slice(0, 25).map((t) => `#${t}`);
}

// 관리자가 게시 전 자유롭게 수정할 수 있는 "초안" 문구. AI 호출 없이 규칙 기반으로 생성해
// 매번 결과가 달라지지 않고, 별도 API 비용도 들지 않는다.
// 인스타그램은 게시물 본문(캡션) 안의 링크를 클릭할 수 없게 막아놔서(바이오 링크만 클릭 가능),
// 상품 링크는 눌러서 이동은 안 되더라도 눈에 보이는 텍스트로 넣어 복사해서 들어올 수 있게 한다.
export function buildDefaultCaption(product: CaptionProduct, minPrice: number | null, isNew: boolean): string {
  const name = getStorefrontName(product);
  const priceLine = minPrice != null ? `\n💰 ${formatWon(minPrice)}부터` : "";
  const badge = isNew ? "🆕 신상품 입고!" : "🌞 지금 추천드리는 상품";
  const productUrl = `https://www.singsingkok.co.kr/products/${product.id}`;
  const hashtags = buildHashtags(product).join(" ");
  const careTip = getFruitCareTip(name) ?? getVegetableRecipeTip(name);
  const careLine = careTip ? `\n\n🍽 맛있게 먹는 법\n${careTip}` : "";

  return `${badge}\n\n${name}${priceLine}${careLine}\n\n산지에서 바로 받아보는 신선함, 싱싱콕에서 만나보세요 🥬\n🔗 ${productUrl}\n👉 더 많은 상품은 프로필 링크에서 만나보세요\n\n${hashtags}`;
}
