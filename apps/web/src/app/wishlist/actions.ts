"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

export interface ToggleWishlistResult {
  ok: boolean;
  wishlisted: boolean;
  message?: string;
}

export async function toggleWishlistAction(productId: string): Promise<ToggleWishlistResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, wishlisted: false, message: "로그인이 필요합니다." };
  }

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    revalidatePath("/wishlist");
    revalidatePath("/");
    return { ok: true, wishlisted: false };
  }

  await prisma.wishlist.create({ data: { userId: session.user.id, productId } });
  revalidatePath("/wishlist");
  revalidatePath("/");
  return { ok: true, wishlisted: true };
}
