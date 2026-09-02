"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

export async function subscribeRestockAction(productId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("로그인이 필요합니다.");

  await prisma.restockSubscription.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: {},
    create: { userId: session.user.id, productId },
  });
  revalidatePath(`/products/${productId}`);
}

export async function unsubscribeRestockAction(productId: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.restockSubscription.deleteMany({ where: { userId: session.user.id, productId } });
  revalidatePath(`/products/${productId}`);
}

export async function isRestockSubscribedAction(productId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  const sub = await prisma.restockSubscription.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });
  return Boolean(sub);
}
