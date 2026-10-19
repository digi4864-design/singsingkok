"use server";

import { revalidatePath } from "next/cache";
import { del, put } from "@vercel/blob";
import { prisma } from "@farm-mall/db";
import { compressImage } from "@farm-mall/sync";
import { auth } from "@/lib/auth";
import { creditReviewReward, REVIEW_REWARD_POINTS } from "@/lib/points";

const MAX_REVIEW_IMAGES = 3;
const REVIEW_IMAGE_MAX_WIDTH = 1000;

// stagingUrls: 브라우저가 Vercel Blob에 이미 직접 올려둔 원본 사진들의 URL
// (ReviewForm.tsx에서 업로드) - Server Action 요청 본문에 사진을 직접 실어 보내면 Vercel
// Functions의 4.5MB 한도에 걸려 고화질 사진에서 업로드가 통째로 실패하던 문제를 피하려고
// URL만 받아서 서버가 fetch로 내려받아 처리한다(관리자 상품이미지 업로드와 동일한 패턴).
async function uploadReviewImages(
  productId: string,
  userId: string,
  stagingUrls: string[]
): Promise<string[]> {
  const urls: string[] = [];
  for (const stagingUrl of stagingUrls.slice(0, MAX_REVIEW_IMAGES)) {
    const res = await fetch(stagingUrl);
    if (!res.ok) continue;
    const raw = Buffer.from(await res.arrayBuffer());
    const { buffer, ext, contentType } = await compressImage(raw, REVIEW_IMAGE_MAX_WIDTH);
    const filename = `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const blob = await put(`reviews/${productId}/${userId}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    urls.push(blob.url);
  }
  await Promise.all(stagingUrls.map((u) => del(u).catch(() => {})));
  return urls;
}

export interface ReviewState {
  ok: boolean;
  message: string;
}

export async function createReviewAction(
  productId: string,
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, message: "로그인 후 이용해주세요." };
  }

  const rating = Number(formData.get("rating"));
  const content = String(formData.get("content") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, message: "평점을 선택해주세요." };
  }
  if (content.length < 2) {
    return { ok: false, message: "리뷰 내용을 2자 이상 입력해주세요." };
  }
  if (content.length > 1000) {
    return { ok: false, message: "리뷰 내용은 1000자 이내로 입력해주세요." };
  }

  const stagingUrls = formData.getAll("imageUrls").filter((u): u is string => typeof u === "string" && u.length > 0);
  const images =
    stagingUrls.length > 0 ? await uploadReviewImages(productId, session.user.id, stagingUrls) : undefined;

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
    select: { id: true },
  });

  await prisma.review.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: { rating, content, ...(images ? { images } : {}) },
    create: { productId, userId: session.user.id, rating, content, images: images ?? [] },
  });

  // 리뷰 보상 포인트는 어뷰징 방지를 위해 최초 작성 시에만 지급한다(수정은 지급 대상 아님).
  if (!existing) {
    await creditReviewReward(session.user.id, productId);
  }

  revalidatePath(`/products/${productId}`);
  return {
    ok: true,
    message: existing
      ? "리뷰가 수정되었습니다."
      : `리뷰가 등록되었습니다. ${REVIEW_REWARD_POINTS}포인트가 적립됐어요!`,
  };
}

export async function deleteMyReviewAction(productId: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.review.deleteMany({
    where: { userId: session.user.id, productId },
  });
  revalidatePath(`/products/${productId}`);
}
