"use server";

import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// 이 구독 등록 자체는 관리자 전용이 아니다(품절 재입고 알림 등 일반 회원도 구독할 수 있어야
// 함). 실제로 관리자에게만 보내야 하는 알림(새 가입/새 주문)은 notifyAdmins()가 발송 대상을
// role: "ADMIN"으로 걸러서 보장한다.
async function requireLoggedIn() {
  const session = await auth();
  if (!session?.user) throw new Error("로그인이 필요합니다.");
  return session;
}

export async function subscribePushAction(input: PushSubscriptionInput) {
  const session = await requireLoggedIn();

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
  await requireLoggedIn();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

// 이 기기(브라우저)가 이미 구독 중인지 화면에 표시하기 위해 확인한다.
export async function isPushSubscribedAction(endpoint: string): Promise<boolean> {
  await requireLoggedIn();
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  return Boolean(sub);
}
