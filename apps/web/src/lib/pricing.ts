export interface MarginBracketRule {
  minPrice: number;
  maxPrice: number | null;
  marginPercent: number;
}

const ROUND_UNIT = 10;

/**
 * 공급가에 해당 구간의 마진율을 적용해 판매가를 계산한다.
 * 일치하는 구간이 없으면 마진 0%(공급가 그대로)로 처리한다.
 */
export function computeSellingPrice(supplyPrice: number, brackets: MarginBracketRule[]): number {
  const bracket = brackets.find(
    (b) => supplyPrice >= b.minPrice && (b.maxPrice === null || supplyPrice < b.maxPrice)
  );
  const marginPercent = bracket?.marginPercent ?? 0;
  const raw = supplyPrice * (1 + marginPercent / 100);
  return Math.round(raw / ROUND_UNIT) * ROUND_UNIT;
}
