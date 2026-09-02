import { prisma } from "@farm-mall/db";

// 모든 옵션이 품절인 공개 상품을 자동으로 비공개 전환한다. 재입고 시 재공개는 관리자가
// 수동으로 해야 한다(의도적으로 비공개한 상품과 자동 감지를 구분하기 위해 한쪽 방향으로만 동작).
export async function deactivateFullySoldOutProducts(): Promise<number> {
  const candidates = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, options: { select: { isAvailable: true } } },
  });
  const soldOutIds = candidates
    .filter((p) => p.options.length > 0 && p.options.every((o) => !o.isAvailable))
    .map((p) => p.id);

  if (soldOutIds.length > 0) {
    await prisma.product.updateMany({ where: { id: { in: soldOutIds } }, data: { isActive: false } });
  }
  return soldOutIds.length;
}
