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
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

/**
 * 기존 상품들의 썸네일·상세이미지·카테고리를 구글 드라이브 기준으로 다시 확인한다.
 * 이미 값이 채워진 항목(수동 업로드 포함)은 건드리지 않고, 비어 있는 항목만 채운다.
 */
export async function resyncThumbnailsAction(): Promise<ResyncResult> {
  await requireAdmin();
  const rootFolderId = process.env.CHOIGOZIP_DRIVE_ROOT_FOLDER_ID;
  if (!process.env.GOOGLE_DRIVE_API_KEY || !rootFolderId) {
    return {
      ok: false,
      message: "GOOGLE_DRIVE_API_KEY가 설정되어 있지 않습니다.",
      updated: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true, thumbnailUrl: true, images: true, categoryId: true, isActive: true },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    const needsThumbnail = !product.thumbnailUrl;
    const needsDetail = product.images.length === 0;
    const needsCategory = !product.categoryId;

    if (!needsThumbnail && !needsDetail && !needsCategory) {
      skipped++;
      continue;
    }

    try {
      const match = await findProductDriveImages(rootFolderId, product.name);
      if (!match.matched) {
        skipped++;
        continue;
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
        skipped++;
        continue;
      }

      await prisma.product.update({ where: { id: product.id }, data });
      updated++;
    } catch (err) {
      console.error(`이미지 재동기화 실패 (${product.name}):`, err);
      failed++;
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    ok: true,
    message: `재동기화 완료: ${updated}건 갱신, ${skipped}건 건너뜀, ${failed}건 실패`,
    updated,
    skipped,
    failed,
  };
}
