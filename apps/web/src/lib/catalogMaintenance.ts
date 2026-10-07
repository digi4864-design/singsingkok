import { prisma } from "@farm-mall/db";

// 모든 옵션이 품절인 공개 상품을 자동으로 비공개 전환한다. 재입고 시 재공개는 관리자가
// 수동으로 해야 한다(의도적으로 비공개한 상품과 자동 감지를 구분하기 위해 한쪽 방향으로만 동작).
// 비공개 처리한 상품명을 함께 돌려줘서 호출부가 관리자에게 무엇이 내려갔는지 알릴 수 있게 한다.
export async function deactivateFullySoldOutProducts(): Promise<string[]> {
  const candidates = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, displayName: true, options: { select: { isAvailable: true } } },
  });
  const soldOut = candidates.filter((p) => p.options.length > 0 && p.options.every((o) => !o.isAvailable));

  if (soldOut.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: soldOut.map((p) => p.id) } },
      data: { isActive: false },
    });
  }
  return soldOut.map((p) => p.displayName ?? p.name);
}
