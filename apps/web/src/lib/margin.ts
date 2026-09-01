// 무통장입금 수동확인 시 저장하는 고정 문자열 - 이 값이면 카드 PG 수수료가 붙지 않는다.
const BANK_TRANSFER_METHOD = "무통장입금(수동확인)";

// 결제수단 문자열만으로 카드결제 여부를 판단한다(무통장입금이 아니고 값이 있으면 카드/간편결제 등으로 간주).
// 결제가 아직 확정되지 않은 주문(method가 null)은 수수료를 매기지 않는다.
export function isCardPayment(method: string | null | undefined): boolean {
  return Boolean(method) && method !== BANK_TRANSFER_METHOD;
}

export function computeCardFee(
  totalAmount: number,
  method: string | null | undefined,
  cardFeePercent: number
): number {
  if (!isCardPayment(method)) return 0;
  return Math.round((totalAmount * cardFeePercent) / 100);
}

// 주문에 포함된 상품들의 원가(공급가) 합계. items는 OrderItem의 unitCost/quantity.
export function computeTotalCost(items: { unitCost: number; quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
}

// 마진금액 = 결제금액(할인 반영) - 카드수수료 - 원가금액.
export function computeMarginAmount(
  totalAmount: number,
  method: string | null | undefined,
  cardFeePercent: number,
  totalCost: number
): number {
  return totalAmount - computeCardFee(totalAmount, method, cardFeePercent) - totalCost;
}
