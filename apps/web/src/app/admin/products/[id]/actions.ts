"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { compressImage } from "@farm-mall/sync";
import { computeSellingPrice } from "@/lib/pricing";
import { requireAdmin } from "@/lib/requireAdmin";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (업로드 후 압축되므로 원본은 넉넉하게 허용)
const THUMB_MAX_WIDTH = 1200;
const DETAIL_MAX_WIDTH = 1600;

// 폴더째로 선택하면 사진 외의 파일(썸네일 캐시, 설명 텍스트 등)이 섞여 들어오기 쉬우므로
// 이미지가 아니거나 너무 큰 파일은 전체를 중단시키지 않고 건너뛴다.
function isUploadableImage(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE;
}

async function saveUploadedFile(productId: string, file: File, prefix: string): Promise<string> {
  const raw = Buffer.from(await file.arrayBuffer());
  const maxWidth = prefix.includes("thumb") ? THUMB_MAX_WIDTH : DETAIL_MAX_WIDTH;
  const { buffer, ext, contentType } = await compressImage(raw, maxWidth);
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const blob = await put(`products/${productId}/${filename}`, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType,
  });
  return blob.url;
}

export interface SaveState {
  ok: boolean;
  message: string;
}

export async function updateProductAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const categoryId = String(formData.get("categoryId") ?? "");
  const isActive = formData.get("isActive") === "on";
  const isFeatured = formData.get("isFeatured") === "on";
  const origin = String(formData.get("origin") ?? "").trim();
  const displayNameInput = String(formData.get("displayName") ?? "").trim();

  try {
    const product = await prisma.product.findUniqueOrThrow({ where: { id }, select: { name: true } });
    // 원본 name과 같으면 별도 표시명을 저장할 필요가 없으니 null로 되돌린다(파트너몰 동기화 기준 키는 name을 그대로 유지).
    const displayName = !displayNameInput || displayNameInput === product.name ? null : displayNameInput;

    await prisma.product.update({
      where: { id },
      data: { categoryId: categoryId || null, isActive, isFeatured, origin: origin || null, displayName },
    });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, message: "저장되었습니다." };
}

export async function updateOptionPriceAction(formData: FormData) {
  await requireAdmin();
  const optionId = String(formData.get("optionId"));
  const productId = String(formData.get("productId"));
  const sellingPrice = Number(formData.get("sellingPrice"));

  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
    throw new Error("판매가를 올바르게 입력해주세요.");
  }

  await prisma.productOption.update({
    where: { id: optionId },
    data: { sellingPrice, isPriceManual: true },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function resetOptionPriceAction(formData: FormData) {
  await requireAdmin();
  const optionId = String(formData.get("optionId"));
  const productId = String(formData.get("productId"));

  const option = await prisma.productOption.findUniqueOrThrow({ where: { id: optionId } });
  const brackets = await prisma.marginBracket.findMany({ orderBy: { minPrice: "asc" } });
  const sellingPrice = computeSellingPrice(option.price, brackets);

  await prisma.productOption.update({
    where: { id: optionId },
    data: { sellingPrice, isPriceManual: false },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export interface UploadState {
  ok: boolean;
  message: string;
}

const MAX_THUMBNAILS = 5;

export async function uploadThumbnailAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const rawFiles = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const uploadedFiles = rawFiles.filter(isUploadableImage);
  const invalidCount = rawFiles.length - uploadedFiles.length;
  if (uploadedFiles.length === 0) {
    return {
      ok: false,
      message:
        invalidCount > 0
          ? "선택한 항목에 이미지 파일이 없습니다. jpg/png/webp/gif, 25MB 이하 파일만 업로드할 수 있습니다."
          : "업로드할 이미지를 선택해주세요.",
    };
  }

  try {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { thumbnailImages: true },
    });
    const remainingSlots = MAX_THUMBNAILS - product.thumbnailImages.length;
    if (remainingSlots <= 0) {
      return { ok: false, message: `썸네일은 최대 ${MAX_THUMBNAILS}장까지 등록할 수 있습니다.` };
    }
    const filesToUpload = uploadedFiles.slice(0, remainingSlots);

    const newUrls: string[] = [];
    for (const file of filesToUpload) {
      newUrls.push(await saveUploadedFile(productId, file, "manual-thumb"));
    }

    const thumbnailImages = [...product.thumbnailImages, ...newUrls];
    await prisma.product.update({
      where: { id: productId },
      // 관리자가 직접 올렸으므로 "자동 동기화가 이 출처에서 가져왔다"는 표시를 지워
      // 다른 상품과 사진을 공유하고 있다는 점검 목록에서 빠지도록 한다.
      data: { thumbnailImages, thumbnailUrl: thumbnailImages[0], thumbnailSourceKey: null },
    });

    const skippedForLimit = uploadedFiles.length - filesToUpload.length;
    const notes: string[] = [];
    if (skippedForLimit > 0) notes.push(`최대 ${MAX_THUMBNAILS}장 제한으로 ${skippedForLimit}장 건너뜀`);
    if (invalidCount > 0) notes.push(`이미지가 아닌 파일 ${invalidCount}개 건너뜀`);

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return {
      ok: true,
      message: `${filesToUpload.length}장 업로드되었습니다.${notes.length > 0 ? ` (${notes.join(", ")})` : ""}`,
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function removeThumbnailImageAction(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { thumbnailImages: true },
  });
  const thumbnailImages = product.thumbnailImages.filter((u) => u !== url);
  await prisma.product.update({
    where: { id: productId },
    data: { thumbnailImages, thumbnailUrl: thumbnailImages[0] ?? null },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function uploadDetailImagesAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const rawFiles = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const uploadedFiles = rawFiles.filter(isUploadableImage);
  const invalidCount = rawFiles.length - uploadedFiles.length;
  if (uploadedFiles.length === 0) {
    return {
      ok: false,
      message:
        invalidCount > 0
          ? "선택한 항목에 이미지 파일이 없습니다. jpg/png/webp/gif, 25MB 이하 파일만 업로드할 수 있습니다."
          : "업로드할 이미지를 선택해주세요.",
    };
  }

  try {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { images: true },
    });
    const newUrls: string[] = [];
    for (const file of uploadedFiles) {
      newUrls.push(await saveUploadedFile(productId, file, "manual-detail"));
    }

    await prisma.product.update({
      where: { id: productId },
      data: { images: [...product.images, ...newUrls] },
    });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {
    ok: true,
    message: `${uploadedFiles.length}개 이미지가 추가되었습니다.${invalidCount > 0 ? ` (이미지가 아닌 파일 ${invalidCount}개 건너뜀)` : ""}`,
  };
}

export async function removeDetailImageAction(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { images: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { images: product.images.filter((u) => u !== url) },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
