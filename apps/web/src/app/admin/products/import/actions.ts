"use server";

import { prisma } from "@farm-mall/db";
import { parseChoigozipExcel, findProductDriveImages, uploadImagesToBlob } from "@farm-mall/sync";
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
    imageSynced: number;
    imageSkipped: number;
    imageFailed: number;
  };
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

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

  const rootFolderId = process.env.CHOIGOZIP_DRIVE_ROOT_FOLDER_ID;
  const hasDriveKey = Boolean(process.env.GOOGLE_DRIVE_API_KEY && rootFolderId);
  const brackets = await prisma.marginBracket.findMany({ orderBy: { minPrice: "asc" } });

  let createdProducts = 0;
  let updatedProducts = 0;
  let totalOptions = 0;
  let imageSynced = 0;
  let imageSkipped = 0;
  let imageFailed = 0;
  const errors: string[] = [];

  for (const parsed of products) {
    const existing = await prisma.product.findUnique({ where: { name: parsed.name } });

    const product = await prisma.product.upsert({
      where: { name: parsed.name },
      update: { lastSyncedAt: new Date() },
      // 상품 사진(썸네일)을 확보하기 전까지는 비공개 상태로 시작한다.
      create: { name: parsed.name, isActive: false },
    });

    if (existing) updatedProducts++;
    else createdProducts++;

    for (const opt of parsed.options) {
      const existingOption = await prisma.productOption.findUnique({
        where: { sourceOptionId: opt.sourceOptionId },
      });
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
    }

    if (!hasDriveKey || product.thumbnailUrl) {
      if (product.thumbnailUrl) imageSkipped++;
      continue;
    }

    try {
      const match = await findProductDriveImages(rootFolderId!, parsed.name);
      const hasThumbnail = match.thumbnailImages.length > 0;
      const hasDetail = match.detailImages.length > 0;

      if (match.matched && (hasThumbnail || hasDetail)) {
        const [thumbUrls, detailUrls] = await Promise.all([
          hasThumbnail
            ? uploadImagesToBlob(match.thumbnailImages.slice(0, 1), product.id, "thumb")
            : [],
          hasDetail ? uploadImagesToBlob(match.detailImages, product.id, "detail") : [],
        ]);
        // 메인 썸네일은 "사진" 폴더(없으면 다른 폴더에서 찾은 대체 사진) 우선, 그것도 없으면 상세페이지 이미지로 대체
        const thumbnailUrl = thumbUrls[0] ?? detailUrls[0];
        const images = detailUrls.length > 0 ? detailUrls : thumbUrls;

        let categoryId: string | undefined;
        if (match.categoryFolder) {
          const category = await prisma.category.upsert({
            where: { name: match.categoryFolder },
            update: {},
            create: { name: match.categoryFolder, slug: slugify(match.categoryFolder) },
          });
          categoryId = category.id;
        }

        await prisma.product.update({
          where: { id: product.id },
          // 썸네일을 확보했으므로 비공개 기본값을 해제하고 공개로 전환한다.
          data: { images, thumbnailUrl, categoryId, isActive: thumbnailUrl ? true : undefined },
        });
        imageSynced++;
      } else {
        imageSkipped++;
      }
    } catch (err) {
      console.error(`Drive 이미지 동기화 실패 (${parsed.name}):`, err);
      errors.push(`[${parsed.name}] ${(err as Error).message}`);
      imageFailed++;
    }
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
      imageSynced,
      imageSkipped,
      imageFailed,
      errorLog: errors.length ? errors.join("\n") : null,
    },
  });

  return {
    ok: true,
    message: hasDriveKey
      ? "업로드 및 이미지 동기화가 완료되었습니다."
      : "업로드가 완료되었습니다. (GOOGLE_DRIVE_API_KEY가 없어 이미지 동기화는 건너뛰었습니다.)",
    summary: {
      totalProducts: products.length,
      totalOptions,
      createdProducts,
      updatedProducts,
      imageSynced,
      imageSkipped,
      imageFailed,
    },
  };
}
