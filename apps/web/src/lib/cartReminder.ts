import { prisma } from "@farm-mall/db";
import { notifyCartAbandonment } from "@/lib/push";
import type { CartActivityItem } from "@/lib/cartActivity";

const IDLE_HOURS = 3;

export interface CartReminderSummary {
  checked: number;
  sent: number;
}

// 장바구니에 담아두고 일정 시간 동안 결제하지 않은 회원에게 리마인드 푸시를 보낸다.
// 매일 자동동기화 크론에서 호출한다(runReviewReminderBatch와 같은 흐름).
export async function runCartAbandonmentReminderBatch(): Promise<CartReminderSummary> {
  const cutoff = new Date(Date.now() - IDLE_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.cartActivity.findMany({
    where: { remindedAt: null, updatedAt: { lte: cutoff } },
    select: { userId: true, itemsJson: true },
  });

  let sent = 0;

  for (const activity of candidates) {
    const items = activity.itemsJson as unknown as CartActivityItem[];
    if (items.length > 0) {
      await notifyCartAbandonment(
        activity.userId,
        items.map((i) => i.name)
      ).catch((err) => console.error(`장바구니 리마인드 발송 실패 (회원 ${activity.userId}):`, err));
      sent++;
    }
    await prisma.cartActivity.update({
      where: { userId: activity.userId },
      data: { remindedAt: new Date() },
    });
  }

  return { checked: candidates.length, sent };
}
