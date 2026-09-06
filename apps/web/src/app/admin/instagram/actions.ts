"use server";

import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { prisma } from "@farm-mall/db";
import { postImagesToInstagram } from "@/lib/instagram";
import { renderInstagramOverlay } from "@/lib/instagramOverlay";
import { requireAdmin } from "@/lib/requireAdmin";

export interface PostState {
  ok: boolean;
  message: string;
}

function getProductImages(product: { thumbnailUrl: string | null; thumbnailImages: string[] }): string[] {
  return product.thumbnailImages.length > 0
    ? product.thumbnailImages
    : product.thumbnailUrl
      ? [product.thumbnailUrl]
      : [];
}

// 대표(첫 장) 사진에만 문구를 합성한 새 이미지를 만들어 Blob에 올리고 그 URL을 돌려준다.
// 캐러셀 나머지 사진은 원본 그대로 둔다 - 첫 장이 "광고 후크", 나머지는 깨끗한 제품 사진이라는
// 인스타그램 카드뉴스 관행을 따른다.
async function buildOverlaidFirstImage(
  productId: string,
  firstImageUrl: string,
  headline: string,
  subline: string
): Promise<string> {
  const res = await fetch(firstImageUrl);
  if (!res.ok) throw new Error(`원본 이미지를 가져오지 못했습니다 (${res.status})`);
  const raw = Buffer.from(await res.arrayBuffer());
  const composited = await renderInstagramOverlay(raw, { headline, subline });

  const hash = createHash("sha256").update(composited).digest("hex").slice(0, 10);
  const blob = await put(`products/${productId}/ig-overlay-${hash}.jpg`, composited, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/jpeg",
  });
  return blob.url;
}

// 관리자가 문구를 입력/수정하는 동안 실제 게시 전에 결과물을 눈으로 확인할 수 있도록,
// Blob에 올리지 않고 데이터 URL로만 만들어 즉시 미리보여준다(게시 전 임시 파일이 쌓이지 않음).
export async function previewOverlayAction(
  imageUrl: string,
  headline: string,
  subline: string
): Promise<{ ok: boolean; dataUrl?: string; message?: string }> {
  await requireAdmin();
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`원본 이미지를 가져오지 못했습니다 (${res.status})`);
    const raw = Buffer.from(await res.arrayBuffer());
    const composited = await renderInstagramOverlay(raw, { headline, subline });
    return { ok: true, dataUrl: `data:image/jpeg;base64,${composited.toString("base64")}` };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export async function postProductToInstagramAction(_prev: PostState, formData: FormData): Promise<PostState> {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const caption = String(formData.get("caption") ?? "").trim();
  const headline = String(formData.get("headline") ?? "").trim();
  const subline = String(formData.get("subline") ?? "").trim();

  if (!caption) {
    return { ok: false, message: "문구를 입력해주세요." };
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { thumbnailUrl: true, thumbnailImages: true },
  });

  const images = getProductImages(product);
  if (images.length === 0) {
    return { ok: false, message: "썸네일 이미지가 없는 상품입니다." };
  }

  let finalImages = images;
  if (headline) {
    try {
      const overlaidFirst = await buildOverlaidFirstImage(productId, images[0], headline, subline);
      finalImages = [overlaidFirst, ...images.slice(1)];
    } catch (err) {
      return { ok: false, message: `사진 위 문구 합성 실패: ${(err as Error).message}` };
    }
  }

  try {
    await postImagesToInstagram(finalImages, caption);
  } catch (err) {
    return { ok: false, message: `게시 실패: ${(err as Error).message}` };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { instagramPostedAt: new Date() },
  });

  revalidatePath("/admin/instagram");
  return { ok: true, message: "인스타그램에 게시되었습니다." };
}
