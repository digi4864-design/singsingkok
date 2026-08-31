"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

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

  await prisma.review.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: { rating, content },
    create: { productId, userId: session.user.id, rating, content },
  });

  revalidatePath(`/products/${productId}`);
  return { ok: true, message: "리뷰가 등록되었습니다." };
}

export async function deleteMyReviewAction(productId: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.review.deleteMany({
    where: { userId: session.user.id, productId },
  });
  revalidatePath(`/products/${productId}`);
}
