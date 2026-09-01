"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { computeSellingPrice } from "@/lib/pricing";
import { requireAdmin } from "@/lib/requireAdmin";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type === "image/png" ? "png" : "jpg";
}

async function saveUploadedFile(productId: string, file: File, prefix: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      `이미지 파일(jpg, png, webp, gif)만 업로드할 수 있습니다. (선택한 파일 형식: ${file.type || "알 수 없음"})`
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `파일 용량이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 15MB 이하 파일을 사용해주세요.`
    );
  }
  const ext = extFromFile(file);
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`products/${productId}/${filename}`, buffer, {
    access: "public",
    addRandomSuffix: false,
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
  const uploadedFiles = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (uploadedFiles.length === 0) {
    return { ok: false, message: "업로드할 이미지를 선택해주세요." };
  }

  try {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
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
      data: { thumbnailImages, thumbnailUrl: thumbnailImages[0] },
    });

    const skipped = uploadedFiles.length - filesToUpload.length;
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return {
      ok: true,
      message:
        skipped > 0
          ? `${filesToUpload.length}장 업로드됨. 최대 ${MAX_THUMBNAILS}장 제한으로 ${skipped}장은 건너뛰었습니다.`
          : `${filesToUpload.length}장 업로드되었습니다.`,
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function removeThumbnailImageAction(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
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
  const uploadedFiles = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (uploadedFiles.length === 0) {
    return { ok: false, message: "업로드할 이미지를 선택해주세요." };
  }

  try {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
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
  return { ok: true, message: `${uploadedFiles.length}개 이미지가 추가되었습니다.` };
}

export async function removeDetailImageAction(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const url = String(formData.get("url"));

  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  await prisma.product.update({
    where: { id: productId },
    data: { images: product.images.filter((u) => u !== url) },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
