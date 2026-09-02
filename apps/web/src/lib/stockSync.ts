import { prisma } from "@farm-mall/db";
import { fetchChoigozipStockInfo } from "@farm-mall/sync";
import { deactivateFullySoldOutProducts } from "./catalogMaintenance";
import { notifyRestockSubscribers } from "./push";

const CONCURRENCY = 5;

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

export interface StockSyncSummary {
  checked: number;
  matched: number;
  optionsUpdated: number;
  productsDeactivated: number;
}

// 최고집 공개 API로 옵션별 품절 여부와 상품 상세설명/공지사항을 매일 최신 상태로 맞춘다.
// 이미지/썸네일은 절대 건드리지 않는다(그건 runImageResyncBatch의 역할이고, 이미 값이
// 채워진 이미지는 그쪽에서도 건드리지 않는다) - 이 함수는 재고 상태와 텍스트 설명만 다룬다.
export async function runStockAndDescriptionSync(): Promise<StockSyncSummary> {
  const products = await prisma.product.findMany({
    include: { options: { select: { id: true, optionName: true, isAvailable: true } } },
  });

  let matched = 0;
  let optionsUpdated = 0;

  await mapWithConcurrency(products, CONCURRENCY, async (product) => {
    const info = await fetchChoigozipStockInfo(product.name).catch((err) => {
      console.error(`최고집 재고 조회 실패 (${product.name}):`, err);
      return null;
    });
    if (!info) return;
    matched++;

    await prisma.product
      .update({
        where: { id: product.id },
        data: { description: info.description, supplierNotice: info.partnerNote },
      })
      .catch((err) => console.error(`상품 설명 갱신 실패 (${product.name}):`, err));

    const hadAvailableBefore = product.options.some((o) => o.isAvailable);

    for (const option of product.options) {
      const nowAvailable = info.optionAvailability.get(option.optionName);
      // 최고집 쪽에 이름이 매칭되는 옵션이 없으면(단종·개명 등) 함부로 바꾸지 않는다.
      if (nowAvailable === undefined || nowAvailable === option.isAvailable) continue;
      await prisma.productOption
        .update({ where: { id: option.id }, data: { isAvailable: nowAvailable } })
        .then(() => {
          optionsUpdated++;
          if (nowAvailable) option.isAvailable = true; // 재입고 판정을 위해 로컬 상태도 갱신
        })
        .catch((err) => console.error(`옵션 재고 갱신 실패 (${product.name} / ${option.optionName}):`, err));
    }

    // 품절 상태였다가 옵션 중 하나라도 다시 판매중이 되면 재입고 알림을 보낸다. 단, 상품이
    // 이미 비공개(isActive=false, 전체품절로 자동 비공개된 상태)라면 고객이 페이지에 들어와도
    // 아직 살 수 없으므로, 그 경우는 관리자가 수동으로 공개 전환할 때(toggleProductActiveAction)
    // 알림을 보낸다.
    const hasAvailableAfter = product.options.some((o) => o.isAvailable);
    if (product.isActive && !hadAvailableBefore && hasAvailableAfter) {
      await notifyRestockSubscribers(product.id, product.name).catch((err) =>
        console.error(`재입고 알림 발송 실패 (${product.name}):`, err)
      );
    }
  });

  const productsDeactivated = await deactivateFullySoldOutProducts();

  return { checked: products.length, matched, optionsUpdated, productsDeactivated };
}
