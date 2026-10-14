import { NextResponse } from "next/server";
import { runImageResyncBatch } from "@/lib/imageResync";
import { runReviewReminderBatch } from "@/lib/reviewReminder";
import { runCartAbandonmentReminderBatch } from "@/lib/cartReminder";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 매일 새벽 자동으로 실행되는 동기화(vercel.json의 crons 설정 참고):
// 구글 드라이브/최고집 공개 API로 썸네일·상세이미지·카테고리가 비어있는 상품만 채운다
// (이미 값이 있으면, 그게 수동 등록이든 자동 등록이든 절대 건드리지 않는다).
// Vercel Cron이 아닌 외부에서 함부로 호출하지 못하도록 CRON_SECRET으로 보호한다.
//
// 재고/상세설명 동기화(runStockAndDescriptionSync)는 예전엔 이 함수 안에서 이미지
// 동기화 다음에 이어서 실행됐는데, 같은 300초 제한을 나눠 쓰다 보니 상품이 많을 때
// 뒤쪽 상품들이 며칠씩 갱신 안 되는 문제가 있어(2026-09-06 발견) /api/cron/stock-sync로
// 분리했다 - 각자 독립된 300초 예산을 갖는다.
const IMAGE_RESYNC_TIME_BUDGET_MS = 250_000;
// 구글 드라이브/최고집 양쪽 다 한동안 "자동화된 요청"으로 보고 403(봇 차단)을 걸 때가
// 있다(실제 발생: 2026-10-15, 로컬에서 이 엔드포인트를 연달아 호출하다 최고집에 막혀서
// 209번의 배치 내내 거의 전부 실패만 반복하며 시간 예산을 통째로 날린 사고). 관리자 화면의
// 수동 재점검 버튼(ResyncThumbnailsButton.tsx)엔 이미 같은 방식의 안전장치가 있었는데
// 이 크론 루프에는 없었다 - 연속 몇 번의 배치에서 갱신이 0건이면(=막혔거나 더 이상
// 자동으로 해결 안 되는 상품들만 남음) 남은 시간 예산을 낭비하며 계속 두드리지 않고 멈춘다.
const MAX_STALLED_BATCHES = 3;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const startedAt = Date.now();
  const imageBatches: { updated: number; skipped: number; failed: number; remaining: number }[] = [];
  let stalledBatches = 0;

  // 남은 상품이 없어질 때까지, 시간 예산(재고 동기화 몫을 남겨두기 위해)을 넘길 때까지,
  // 또는 연속으로 진전이 없을 때까지 반복한다.
  while (Date.now() - startedAt < IMAGE_RESYNC_TIME_BUDGET_MS) {
    const result = await runImageResyncBatch(30);
    if (!result.ok) {
      imageBatches.push({ updated: 0, skipped: 0, failed: 0, remaining: 0 });
      break;
    }
    imageBatches.push(result);
    if (result.remaining === 0) break;

    stalledBatches = result.updated === 0 ? stalledBatches + 1 : 0;
    if (stalledBatches >= MAX_STALLED_BATCHES) break;
  }

  const reviewReminderSummary = await runReviewReminderBatch().catch((err) => {
    console.error("리뷰 리마인드 발송 실패:", err);
    return null;
  });

  const cartReminderSummary = await runCartAbandonmentReminderBatch().catch((err) => {
    console.error("장바구니 리마인드 발송 실패:", err);
    return null;
  });

  const imageSummary = imageBatches.reduce(
    (acc, b) => ({
      updated: acc.updated + b.updated,
      skipped: acc.skipped + b.skipped,
      failed: acc.failed + b.failed,
    }),
    { updated: 0, skipped: 0, failed: 0 }
  );

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    imageSync: { ...imageSummary, batches: imageBatches.length },
    reviewReminder: reviewReminderSummary,
    cartReminder: cartReminderSummary,
  });
}
