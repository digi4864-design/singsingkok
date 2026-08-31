"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function toggleReviewHiddenAction(
  reviewId: string,
  currentIsHidden: boolean,
  _formData: FormData
) {
  await requireAdmin();
  await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden: !currentIsHidden },
  });
  revalidatePath("/admin/reviews");
  revalidatePath("/products");
}

export async function deleteReviewAction(reviewId: string, _formData: FormData) {
  await requireAdmin();
  const review = await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath("/admin/reviews");
  revalidatePath(`/products/${review.productId}`);
}
