import { prisma } from "@farm-mall/db";
import { fetchChoigozipStockInfo, rehostInlineDescriptionImages } from "@farm-mall/sync";
import { deactivateFullySoldOutProducts } from "./catalogMaintenance";
import { notifyRestockSubscribers } from "./push";

// 설명에 박힌 이미지 재호스팅(압축+업로드)이 추가되면서 상품당 메모리 사용량이 커졌다.
// 동시성 5로 큰 이미지 여러 개를 한꺼번에 처리하면 서버리스 함수 메모리 한도에 걸려
// 재호스팅이 조용히 실패하는 경우가 실제로 있었다(감자탕/레몬/메론 등 2~9MB급 설명들).
const CONCURRENCY = 2;
// 최고집 공개 API가 가끔 응답이 없거나 느릴 때, fetch 자체엔 기본 타임아웃이 없어서 동시성
// 슬롯 하나가 무한정 멈춰있을 수 있다(실제로 이 때문에 8/29에 대량 등록된 상품 중 100개
// 이상이 여러 날 동안 계속 상세설명을 못 받아온 사고가 있었음 - 뒤쪽 상품일수록 앞의 느린
// 요청들 때문에 함수 실행시간 제한 내에 차례가 오지 않았던 것으로 추정). 상품 하나당 최대
// 대기 시간을 둬서 느린 상품 하나가 전체 배치를 막지 않도록 한다.
const PER_PRODUCT_TIMEOUT_MS = 15_000;

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`시간 초과: ${label}`)), ms)),
  ]);
}

export interface StockSyncSummary {
  checked: number;
  matched: number;
  optionsUpdated: number;
  productsDeactivated: number;
}

// 최고집 공개 API로 옵션별 품절 여부와 상품 상세설명/공지사항을 매일 최신 상태로 맞춘다.
// 썸네일은 절대 건드리지 않는다(그건 runImageResyncBatch의 역할). 상세이미지 갤러리(images)도
// 원칙적으로 건드리지 않지만, 설명란에 통째로 박힌 이미지가 유일한 상세페이지 소스이고
// 갤러리가 아직 비어 있는 경우에 한해서만 예외적으로 채워 넣는다(아래 shouldBackfillImages 참고).
export async function runStockAndDescriptionSync(): Promise<StockSyncSummary> {
  // updatedAt 오름차순 = "가장 오래 전에 갱신됐거나 한 번도 갱신되지 않은" 상품부터 처리한다.
  // 배치가 시간 제한으로 도중에 끊기더라도, 오늘 처리 못한 상품이 내일은 맨 앞으로 와서
  // 특정 상품만 계속 뒤로 밀려 영영 갱신되지 않는 일이 없도록 한다.
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      images: true,
      options: { select: { id: true, optionName: true, isAvailable: true } },
    },
    orderBy: { updatedAt: "asc" },
  });

  let matched = 0;
  let optionsUpdated = 0;

  await mapWithConcurrency(products, CONCURRENCY, async (product) => {
    const info = await withTimeout(
      fetchChoigozipStockInfo(product.name),
      PER_PRODUCT_TIMEOUT_MS,
      product.name
    ).catch((err) => {
      console.error(`최고집 재고 조회 실패 (${product.name}):`, err);
      return null;
    });
    if (!info) return;
    matched++;

    // 최고집 원본 설명에 사진이 base64로 통째로 박혀 들어오는 경우가 있어(상품 하나에 최대
    // 9MB, 실제 발견: "홈마카세" 9MB 등 40개 상품) 그대로 저장하면 상품 상세페이지 하나가
    // 몇 MB씩 나가게 된다. 저장 전에 항상 이미지를 우리 저장소로 옮기고 가벼운 URL로 바꾼다.
    const rehosted = info.description
      ? await rehostInlineDescriptionImages(info.description, product.id).catch((err) => {
          console.error(`설명 이미지 재호스팅 실패 (${product.name}):`, err);
          return { html: info.description as string, imageUrls: [] as string[] };
        })
      : null;
    const description = rehosted ? rehosted.html : info.description;

    // 최고집은 실제 "상세페이지" 컷을 별도 사진이 아니라 설명란에 통째로 박힌 이미지 하나로만
    // 제공하는 경우가 많다(구글드라이브에 그 상품 전용 사진폴더가 없으면 이게 유일한 상세이미지
    // 소스임 - 실제 사고: 머스크 메론/암꽃게장이 상세페이지 없이 노출됨). 설명에 실질적인
    // 글자 없이 이미지만 있고, 아직 상세이미지 갤러리가 비어 있는 상품이라면 그 이미지를
    // 갤러리로도 채워 넣어 상세정보 섹션에 실제로 보이게 한다. 이미 사진이 있는 상품이나
    // 설명에 진짜 안내 글이 섞여 있는 경우(설명 자체가 그대로 렌더링됨)는 건드리지 않는다.
    const hasOnlyImageNoText =
      rehosted != null && rehosted.imageUrls.length > 0 && !rehosted.html.replace(/<[^>]*>/g, "").trim();
    const shouldBackfillImages = hasOnlyImageNoText && product.images.length === 0;

    await prisma.product
      .update({
        where: { id: product.id },
        data: {
          description,
          supplierNotice: info.partnerNote,
          ...(shouldBackfillImages ? { images: rehosted!.imageUrls } : {}),
        },
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
