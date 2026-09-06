import { prisma } from "@farm-mall/db";

export interface LimitedEventStatus {
  label: string;
  total: number;
  remaining: number;
}

export interface LimitedEventOption {
  id: string;
  limitedEventTotal: number | null;
  limitedEventLabel: string | null;
  limitedEventStartsAt: Date | null;
}

// 가격을 부풀렸다 할인하는 방식(표시광고법상 "할인율 부풀리기" 위반 소지) 대신, 진짜 수량을
// 정해두고 소진되면 끝나는 방식으로 긴급성을 만든다. 남은 수량을 별도 필드로 저장/차감하지
// 않고, 이벤트 시작 이후 실제로 발생한 주문 수량을 그때그때 집계해서 계산한다 - 결제 흐름에
// 손대지 않아(원자적 차감/동시성 처리 불필요) 기존 주문 로직에 영향이 없다. 소규모 주문량이라
// 아주 드물게 동시 주문으로 remaining이 0 밑으로 내려갈 수 있지만(과다판매), 실제 재고는
// 공급사 쪽에 있어 배송 자체엔 문제가 없다 - "선착순" 문구 그대로다.
export async function getLimitedEventStatus(option: LimitedEventOption): Promise<LimitedEventStatus | null> {
  if (!option.limitedEventTotal || !option.limitedEventStartsAt) return null;

  const sold = await prisma.orderItem.aggregate({
    where: {
      productOptionId: option.id,
      order: { createdAt: { gte: option.limitedEventStartsAt }, status: { not: "CANCELED" } },
    },
    _sum: { quantity: true },
  });

  const soldCount = sold._sum.quantity ?? 0;
  return {
    label: option.limitedEventLabel ?? "수량한정 특가",
    total: option.limitedEventTotal,
    remaining: Math.max(0, option.limitedEventTotal - soldCount),
  };
}
