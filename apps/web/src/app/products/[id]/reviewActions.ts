"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@farm-mall/db";
import { compressImage } from "@farm-mall/sync";
import { auth } from "@/lib/auth";
import { creditReviewReward, REVIEW_REWARD_POINTS } from "@/lib/points";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_REVIEW_IMAGES = 3;
const REVIEW_IMAGE_MAX_WIDTH = 1000;

async function uploadReviewImages(productId: string, userId: string, files: File[]): Promise<string[]> {
  const valid = files
    .filter((f) => f.size > 0 && ALLOWED_IMAGE_TYPES.has(f.type) && f.size <= MAX_FILE_SIZE)
    .slice(0, MAX_REVIEW_IMAGES);

  const urls: string[] = [];
  for (const file of valid) {
    const raw = Buffer.from(await file.arrayBuffer());
    const { buffer, ext, contentType } = await compressImage(raw, REVIEW_IMAGE_MAX_WIDTH);
    const filename = `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const blob = await put(`reviews/${productId}/${userId}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType,
    });
    urls.push(blob.url);
  }
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

  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const images = files.length > 0 ? await uploadReviewImages(productId, session.user.id, files) : undefined;

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
