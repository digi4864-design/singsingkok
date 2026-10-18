"use server";

import AdmZip from "adm-zip";
import { del, put } from "@vercel/blob";
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

async function saveUploadedBuffer(productId: string, raw: Buffer, prefix: string): Promise<string> {
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

async function saveUploadedFile(productId: string, file: File, prefix: string): Promise<string> {
  return saveUploadedBuffer(productId, Buffer.from(await file.arrayBuffer()), prefix);
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

export async function setLimitedEventAction(formData: FormData) {
  await requireAdmin();
  const optionId = String(formData.get("optionId"));
  const productId = String(formData.get("productId"));
  const total = Number(formData.get("limitedEventTotal"));
  const label = String(formData.get("limitedEventLabel") ?? "").trim();

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("한정 수량을 1개 이상 입력해주세요.");
  }

  await prisma.productOption.update({
    where: { id: optionId },
    data: {
      limitedEventTotal: total,
      limitedEventLabel: label || "수량한정 특가",
      limitedEventStartsAt: new Date(),
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/products/${productId}`);
}

export async function clearLimitedEventAction(formData: FormData) {
  await requireAdmin();
  const optionId = String(formData.get("optionId"));
  const productId = String(formData.get("productId"));

  await prisma.productOption.update({
    where: { id: optionId },
    data: { limitedEventTotal: null, limitedEventLabel: null, limitedEventStartsAt: null },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/products/${productId}`);
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

const MAX_ZIP_SIZE = 150 * 1024 * 1024; // 150MB (압축 전 원본 여러 장이 들어있을 수 있어 넉넉하게 허용)
const THUMB_FOLDER_RE = [/^썸네일$/i, /thumbnail/i, /^thumb$/i];
const DETAIL_FOLDER_RE = [/^상세페이지$/i, /^상세$/i, /detail/i];

function isImageEntryName(name: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(name);
}

// 압축파일 안 경로(예: "상품/썸네일/1.jpg")의 폴더 구간 중 하나라도 패턴에 맞으면 매치로 본다 -
// 폴더를 통째로 압축하면 상위에 상품명 폴더가 한 겹 더 씌워져 들어오는 경우가 많기 때문.
function matchesAnyFolder(pathSegments: string[], patterns: RegExp[]): boolean {
  return pathSegments.some((seg) => patterns.some((p) => p.test(seg)));
}

// 압축파일을 Server Action의 요청 본문으로 직접 보내면 Vercel Functions의 요청 본문 용량
// 한도(4.5MB, next.config.ts의 bodySizeLimit로는 못 늘림)에 사진 몇 장만 들어가도 바로
// 걸려 "압축파일 안 사진이 크면 오류난다"는 문제가 생겼다. 그래서 브라우저가 zip을
// Vercel Blob에 먼저 직접 올리고(용량 제한 없음, handleUploadUrl=/api/admin/blob-upload),
// 이 액션은 업로드된 zip의 URL만 받아서 서버 쪽에서 fetch로 내려받아 처리한다 - 서버가 자체
// 요청으로 내려받는 데이터는 저 4.5MB 한도의 대상이 아니다.
export async function processProductZipAction(
  productId: string,
  zipBlobUrl: string
): Promise<UploadState> {
  await requireAdmin();

  let zipBuffer: Buffer;
  try {
    const res = await fetch(zipBlobUrl);
    if (!res.ok) throw new Error(`압축파일을 내려받지 못했습니다. (status ${res.status})`);
    zipBuffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
  if (zipBuffer.length > MAX_ZIP_SIZE) {
    return { ok: false, message: "압축파일이 너무 큽니다. (최대 150MB)" };
  }

  let entries: AdmZip.IZipEntry[];
  try {
    entries = new AdmZip(zipBuffer).getEntries();
  } catch {
    await del(zipBlobUrl).catch(() => {});
    return { ok: false, message: "압축파일을 읽을 수 없습니다. zip 형식인지 확인해주세요." };
  }

  const thumbEntries: AdmZip.IZipEntry[] = [];
  const detailEntries: AdmZip.IZipEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName;
    const baseName = name.split("/").pop() ?? name;
    if (name.includes("__MACOSX") || baseName.startsWith(".")) continue;
    if (!isImageEntryName(baseName)) continue;
    if (entry.header.size > MAX_FILE_SIZE) continue;

    const folderSegments = name.split("/").slice(0, -1);
    if (matchesAnyFolder(folderSegments, THUMB_FOLDER_RE)) {
      thumbEntries.push(entry);
    } else if (matchesAnyFolder(folderSegments, DETAIL_FOLDER_RE)) {
      detailEntries.push(entry);
    }
  }

  if (thumbEntries.length === 0 && detailEntries.length === 0) {
    await del(zipBlobUrl).catch(() => {});
    return {
      ok: false,
      message:
        '압축파일 안에서 "썸네일" 또는 "상세페이지" 폴더를 찾지 못했습니다. 폴더 이름을 확인해주세요.',
    };
  }

  // 썸네일 폴더만 있으면 같은 이미지를 상세페이지에도 그대로 등록한다.
  const detailSourceEntries = detailEntries.length > 0 ? detailEntries : thumbEntries;

  const byEntryName = (a: AdmZip.IZipEntry, b: AdmZip.IZipEntry) =>
    a.entryName.localeCompare(b.entryName);
  thumbEntries.sort(byEntryName);
  detailSourceEntries.sort(byEntryName);

  try {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { thumbnailImages: true, images: true },
    });

    const notes: string[] = [];
    let thumbUploadedCount = 0;
    let detailUploadedCount = 0;

    let thumbnailImages = product.thumbnailImages;
    if (thumbEntries.length > 0) {
      const remainingSlots = Math.max(MAX_THUMBNAILS - product.thumbnailImages.length, 0);
      const toUpload = thumbEntries.slice(0, remainingSlots);
      const skipped = thumbEntries.length - toUpload.length;
      if (skipped > 0) notes.push(`썸네일 최대 ${MAX_THUMBNAILS}장 제한으로 ${skipped}장 건너뜀`);

      const newUrls: string[] = [];
      for (const entry of toUpload) {
        newUrls.push(await saveUploadedBuffer(productId, entry.getData(), "manual-thumb"));
      }
      thumbUploadedCount = newUrls.length;
      if (newUrls.length > 0) thumbnailImages = [...product.thumbnailImages, ...newUrls];
    }

    let images = product.images;
    if (detailSourceEntries.length > 0) {
      const newUrls: string[] = [];
      for (const entry of detailSourceEntries) {
        newUrls.push(await saveUploadedBuffer(productId, entry.getData(), "manual-detail"));
      }
      detailUploadedCount = newUrls.length;
      images = [...product.images, ...newUrls];
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        thumbnailImages,
        images,
        ...(thumbUploadedCount > 0
          ? { thumbnailUrl: thumbnailImages[0], thumbnailSourceKey: null }
          : {}),
      },
    });

    await del(zipBlobUrl).catch(() => {});

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return {
      ok: true,
      message: `썸네일 ${thumbUploadedCount}장, 상세페이지 ${detailUploadedCount}장이 등록되었습니다.${
        notes.length > 0 ? ` (${notes.join(", ")})` : ""
      }`,
    };
  } catch (err) {
    await del(zipBlobUrl).catch(() => {});
    return { ok: false, message: (err as Error).message };
  }
}
