"use server";

import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function subscribePushAction(input: PushSubscriptionInput) {
  const session = await requireAdmin();

  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { userId: session.user.id, p256dh: input.p256dh, auth: input.auth },
    create: {
      userId: session.user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
  });
}

export async function unsubscribePushAction(endpoint: string) {
  await requireAdmin();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

// 이 기기(브라우저)가 이미 구독 중인지 화면에 표시하기 위해 확인한다.
export async function isPushSubscribedAction(endpoint: string): Promise<boolean> {
  await requireAdmin();
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  return Boolean(sub);
}
