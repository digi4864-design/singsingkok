"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { findProductDriveImages, uploadImagesToBlob } from "@farm-mall/sync";
import { requireAdmin } from "@/lib/requireAdmin";

export interface ResyncResult {
  ok: boolean;
  message: string;
  updated: number;
  skipped: number;
  failed: number;
  remaining: number;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

const CONCURRENCY = 10;
// 상품명이 드라이브 폴더 구조와 잘 안 맞으면(카테고리 힌트 없이 전체 폴더를 뒤져야 해서)
// 한 상품 매칭에만 아주 오래 걸릴 수 있다. 배치 전체가 이 한 상품 때문에 함수 실행시간
// 제한을 넘기지 않도록 상품당 최대 대기 시간을 둔다 — 시간 초과되면 "건너뜀"으로 처리하고
// 다음 배치에서 다시 시도한다.
const PER_PRODUCT_TIMEOUT_MS = 18_000;

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

const NEEDS_SYNC_WHERE = {
  OR: [{ thumbnailUrl: null }, { images: { isEmpty: true } }, { categoryId: null }],
};

/**
 * 기존 상품들의 썸네일·상세이미지·카테고리를 구글 드라이브 기준으로 다시 확인한다.
 * 이미 값이 채워진 항목(수동 업로드 포함)은 건드리지 않고, 비어 있는 항목만 채운다.
 *
 * 상품당 여러 번의 Drive API 왕복이 필요해 카탈로그 전체를 한 번에 처리하면 서버리스
 * 함수 실행시간 제한을 넘길 수 있으므로, 한 번 호출에 최대 `batchSize`개만 처리하고
 * 남은 개수(remaining)를 돌려준다. 클라이언트는 remaining이 0이 될 때까지 반복 호출한다.
 */
export async function resyncThumbnailsAction(batchSize = 15): Promise<ResyncResult> {
  await requireAdmin();
  const rootFolderId = process.env.CHOIGOZIP_DRIVE_ROOT_FOLDER_ID;
  if (!process.env.GOOGLE_DRIVE_API_KEY || !rootFolderId) {
    return {
      ok: false,
      message: "GOOGLE_DRIVE_API_KEY가 설정되어 있지 않습니다.",
      updated: 0,
      skipped: 0,
      failed: 0,
      remaining: 0,
    };
  }

  // updatedAt 오름차순 = "가장 오래 전에 시도됐거나 한 번도 시도되지 않은" 상품부터.
  // 매칭에 계속 실패하는 상품도 아래에서 시도 후 updatedAt이 갱신되므로 다음 배치에서는
  // 뒤로 밀려나고, 아직 안 건드린 상품이 먼저 시도된다(같은 실패 상품만 무한 반복되는 것 방지).
  const products = await prisma.product.findMany({
    where: NEEDS_SYNC_WHERE,
    select: { id: true, name: true, thumbnailUrl: true, images: true, categoryId: true, isActive: true },
    orderBy: { updatedAt: "asc" },
    take: batchSize,
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  await mapWithConcurrency(products, CONCURRENCY, async (product) => {
    const needsThumbnail = !product.thumbnailUrl;
    const needsDetail = product.images.length === 0;
    const needsCategory = !product.categoryId;

    try {
      const match = await withTimeout(
        findProductDriveImages(rootFolderId, product.name),
        PER_PRODUCT_TIMEOUT_MS,
        product.name
      );
      if (!match.matched) {
        // 매칭 실패도 "시도했음"으로 표시해 다음 배치에서 뒤로 밀려나도록 한다.
        await prisma.product.update({ where: { id: product.id }, data: {} });
        skipped++;
        return;
      }

      const data: { thumbnailUrl?: string; images?: string[]; categoryId?: string; isActive?: boolean } = {};

      if (needsThumbnail && match.thumbnailImages.length > 0) {
        const saved = await uploadImagesToBlob(match.thumbnailImages.slice(0, 1), product.id, "thumb");
        if (saved[0]) {
          data.thumbnailUrl = saved[0];
          // 이미지를 못 찾아 비공개 처리됐던 상품이 이번에 썸네일을 확보하면 자동으로 공개 전환
          if (!product.isActive) data.isActive = true;
        }
      }

      if (needsDetail && match.detailImages.length > 0) {
        const saved = await uploadImagesToBlob(match.detailImages, product.id, "detail");
        if (saved.length > 0) data.images = saved;
      }

      if (needsCategory && match.categoryFolder) {
        const category = await prisma.category.upsert({
          where: { name: match.categoryFolder },
          update: {},
          create: { name: match.categoryFolder, slug: slugify(match.categoryFolder) },
        });
        data.categoryId = category.id;
      }

      if (Object.keys(data).length === 0) {
        await prisma.product.update({ where: { id: product.id }, data: {} });
        skipped++;
        return;
      }

      await prisma.product.update({ where: { id: product.id }, data });
      updated++;
    } catch (err) {
      console.error(`이미지 재동기화 실패 (${product.name}):`, err);
      await prisma.product.update({ where: { id: product.id }, data: {} }).catch(() => {});
      failed++;
    }
  });

  const remaining = await prisma.product.count({ where: NEEDS_SYNC_WHERE });

  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    ok: true,
    message: `이번 배치: ${updated}건 갱신, ${skipped}건 건너뜀, ${failed}건 실패`,
    updated,
    skipped,
    failed,
    remaining,
  };
}
