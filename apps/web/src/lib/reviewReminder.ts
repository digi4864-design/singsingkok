import { prisma } from "@farm-mall/db";
import { getStorefrontName } from "@/lib/productDisplay";
import { notifyReviewReminder } from "@/lib/push";

const REMINDER_DELAY_DAYS = 3;

export interface ReviewReminderSummary {
  checked: number;
  sent: number;
}

// 배송완료(구매확정) 후 일정 기간이 지난 주문의 구매자에게 리뷰 작성을 부탁하는 푸시를 보낸다.
// 가짜 리뷰를 만드는 대신, 실제 구매자가 리뷰를 남기도록 유도하는 정공법 - 매일 자동동기화
// 크론에서 호출한다(runStockAndDescriptionSync와 같은 흐름).
export async function runReviewReminderBatch(): Promise<ReviewReminderSummary> {
  const cutoff = new Date(Date.now() - REMINDER_DELAY_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      customerId: { not: null },
      reviewReminderSentAt: null,
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      customerId: true,
      items: {
        select: {
          productOption: {
            select: { product: { select: { id: true, name: true, displayName: true } } },
          },
        },
      },
    },
  });

  let sent = 0;

  for (const order of candidates) {
    const products = new Map(
      order.items.map((item) => [item.productOption.product.id, item.productOption.product])
    );

    const alreadyReviewed = await prisma.review.findMany({
      where: { userId: order.customerId!, productId: { in: [...products.keys()] } },
      select: { productId: true },
    });
    const reviewedIds = new Set(alreadyReviewed.map((r) => r.productId));
    const unreviewed = [...products.values()].filter((p) => !reviewedIds.has(p.id));

    if (unreviewed.length > 0) {
      await notifyReviewReminder(
        order.customerId!,
        order.id,
        unreviewed.map((p) => getStorefrontName(p))
      ).catch((err) => console.error(`리뷰 리마인드 발송 실패 (주문 ${order.id}):`, err));
      sent++;
    }

    await prisma.order.update({ where: { id: order.id }, data: { reviewReminderSentAt: new Date() } });
  }

  return { checked: candidates.length, sent };
}
