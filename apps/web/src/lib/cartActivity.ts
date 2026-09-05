import { prisma, Prisma } from "@farm-mall/db";

export interface CartActivityItem {
  productId: string;
  name: string;
  quantity: number;
}

// 장바구니 방치 알림용 스냅샷을 갱신한다. 장바구니 자체(가격/재고의 원천)는 계속 브라우저에만
// 저장되고, 이 함수는 리마인드 문구 생성을 위한 최소 정보만 별도로 남긴다. 내용이 바뀔 때마다
// remindedAt을 초기화해서, 이미 리마인드를 보낸 뒤에도 새로 담은 상품이 있으면 다시 알림
// 대상이 되도록 한다.
export async function syncCartActivity(userId: string, items: CartActivityItem[]) {
  if (items.length === 0) {
    await prisma.cartActivity.deleteMany({ where: { userId } });
    return;
  }
  const itemsJson = items as unknown as Prisma.InputJsonValue;
  await prisma.cartActivity.upsert({
    where: { userId },
    create: { userId, itemsJson },
    update: { itemsJson, remindedAt: null },
  });
}

// 결제가 완료되면 더 이상 "방치"가 아니므로 스냅샷을 지운다.
export async function clearCartActivity(userId: string) {
  await prisma.cartActivity.deleteMany({ where: { userId } });
}
