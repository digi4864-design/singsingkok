"use server";

import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
  const dir = path.join(process.cwd(), "public", "products", productId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ext = extFromFile(file);
  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(path.join(dir, filename), buffer);
  return `/products/${productId}/${filename}`;
}

export async function updateProductAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const categoryId = String(formData.get("categoryId") ?? "");
  const isActive = formData.get("isActive") === "on";
  const isFeatured = formData.get("isFeatured") === "on";
  const origin = String(formData.get("origin") ?? "").trim();

  await prisma.product.update({
    where: { id },
    data: { categoryId: categoryId || null, isActive, isFeatured, origin: origin || null },
  });

  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
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

export async function uploadThumbnailAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "업로드할 이미지를 선택해주세요." };
  }

  try {
    const url = await saveUploadedFile(productId, file, "manual-thumb");
    await prisma.product.update({ where: { id: productId }, data: { thumbnailUrl: url } });
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, message: "썸네일이 업로드되었습니다." };
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
