"use server";

import { prisma } from "@farm-mall/db";
import { parseChoigozipExcel } from "@farm-mall/sync";
import { computeSellingPrice } from "@/lib/pricing";
import { applyCategoryRules } from "@/lib/categoryRules";
import { requireAdmin } from "@/lib/requireAdmin";

export interface ImportState {
  ok: boolean;
  message: string;
  summary?: {
    totalProducts: number;
    totalOptions: number;
    createdProducts: number;
    updatedProducts: number;
  };
}

// 상품 수가 많으면 한 상품씩 순차 처리하는 것만으로도 시간이 걸리므로, 서로 독립적인
// 상품 upsert를 동시에 여러 개 처리해 전체 시간을 줄인다.
const CONCURRENCY = 8;

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

// 엑셀 업로드는 상품명/가격/재고 같은 "빠른" 메타데이터만 반영한다. 구글 드라이브에서
// 썸네일·상세이미지·카테고리를 찾아 채우는 작업은 상품당 여러 번의 네트워크 왕복이 필요해
// 카탈로그 전체를 한 번에 처리하면 서버리스 함수 실행시간 제한을 넘겨 버린다(실제로 겪은
// 문제: 브라우저에 "This page couldn't load" 표시). 그래서 이미지 동기화는 별도의
// resyncThumbnailsAction으로 분리해, 여러 번에 나눠 안전하게 처리한다.
export async function importProductsAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "엑셀 파일을 선택해주세요." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let products;
  try {
    products = parseChoigozipExcel(buffer);
  } catch (err) {
    return { ok: false, message: `엑셀 파싱 실패: ${(err as Error).message}` };
  }

  if (products.length === 0) {
    return { ok: false, message: "엑셀에서 상품 데이터를 찾지 못했습니다." };
  }

  const importRun = await prisma.importRun.create({ data: {} });
  const brackets = await prisma.marginBracket.findMany({ orderBy: { minPrice: "asc" } });

  // 상품/옵션 존재 여부를 매번 개별 조회하는 대신 한 번에 미리 가져와, 상품 수만큼
  // 반복되던 DB 왕복 횟수를 줄인다(Neon과의 리전 간 지연이 누적되는 것을 완화).
  const [existingProducts, existingOptions] = await Promise.all([
    prisma.product.findMany({
      where: { name: { in: products.map((p) => p.name) } },
      select: { id: true, name: true },
    }),
    prisma.productOption.findMany({
      where: { sourceOptionId: { in: products.flatMap((p) => p.options.map((o) => o.sourceOptionId)) } },
      select: { sourceOptionId: true, isPriceManual: true, sellingPrice: true },
    }),
  ]);
  const existingProductByName = new Map(existingProducts.map((p) => [p.name, p]));
  const existingOptionBySourceId = new Map(existingOptions.map((o) => [o.sourceOptionId, o]));

  let createdProducts = 0;
  let updatedProducts = 0;
  let totalOptions = 0;

  await mapWithConcurrency(products, CONCURRENCY, async (parsed) => {
    const existing = existingProductByName.get(parsed.name);

    const product = await prisma.product.upsert({
      where: { name: parsed.name },
      update: { lastSyncedAt: new Date() },
      // 상품 사진(썸네일)을 확보하기 전까지는 비공개 상태로 시작한다.
      create: { name: parsed.name, isActive: false },
    });

    if (existing) updatedProducts++;
    else createdProducts++;

    await Promise.all(
      parsed.options.map(async (opt) => {
        const existingOption = existingOptionBySourceId.get(opt.sourceOptionId);
        const sellingPrice =
          existingOption?.isPriceManual && existingOption.sellingPrice
            ? existingOption.sellingPrice
            : computeSellingPrice(opt.price, brackets);

        await prisma.productOption.upsert({
          where: { sourceOptionId: opt.sourceOptionId },
          update: {
            productId: product.id,
            optionName: opt.optionName,
            price: opt.price,
            sellingPrice,
            compliancePrice: opt.compliancePrice,
            isAvailable: opt.isAvailable,
            supplierCourier: opt.supplierCourier,
            outboundType: opt.outboundType,
            orderCutoff: opt.orderCutoff,
          },
          create: {
            productId: product.id,
            sourceOptionId: opt.sourceOptionId,
            optionName: opt.optionName,
            price: opt.price,
            sellingPrice,
            compliancePrice: opt.compliancePrice,
            isAvailable: opt.isAvailable,
            supplierCourier: opt.supplierCourier,
            outboundType: opt.outboundType,
            orderCutoff: opt.orderCutoff,
          },
        });
        totalOptions++;
      })
    );

    // 모든 옵션이 품절이면 자동으로 비공개 전환한다(재입고 시 공개 전환은 관리자가 직접 처리).
    const allSoldOut = parsed.options.length > 0 && parsed.options.every((o) => !o.isAvailable);
    if (allSoldOut && product.isActive) {
      await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
    }
  });

  // sourceOptionId(관리코드)가 다른 상품으로 재배정되면 기존 상품은 옵션이 0개로 남을 수 있다
  // (예: 최고집이 같은 관리코드를 다른 상품명에 재사용한 경우). 이번 배치에서 다루지 않은
  // 상품도 영향받을 수 있으므로 전체 공개 상품을 대상으로 점검한다.
  const zeroOptionProducts = await prisma.product.findMany({
    where: { isActive: true, options: { none: {} } },
    select: { id: true },
  });
  if (zeroOptionProducts.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: zeroOptionProducts.map((p) => p.id) } },
      data: { isActive: false },
    });
  }

  await applyCategoryRules();

  await prisma.importRun.update({
    where: { id: importRun.id },
    data: {
      finishedAt: new Date(),
      totalProducts: products.length,
      totalOptions,
      createdProducts,
      updatedProducts,
    },
  });

  return {
    ok: true,
    message:
      "업로드가 완료되었습니다. 사진이 없는 상품은 비공개 상태이니, 아래 \"이미지/카테고리 재점검\" 버튼을 눌러 이미지를 동기화해주세요.",
    summary: {
      totalProducts: products.length,
      totalOptions,
      createdProducts,
      updatedProducts,
    },
  };
}
