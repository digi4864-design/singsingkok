import { NextResponse } from "next/server";
import { runImageResyncBatch } from "@/lib/imageResync";
import { runStockAndDescriptionSync } from "@/lib/stockSync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 매일 새벽 자동으로 실행되는 동기화(vercel.json의 crons 설정 참고):
// 1) 구글 드라이브/최고집 공개 API로 썸네일·상세이미지·카테고리가 비어있는 상품만 채운다
//    (이미 값이 있으면, 그게 수동 등록이든 자동 등록이든 절대 건드리지 않는다).
// 2) 최고집 공개 API로 옵션별 품절 여부와 상품 설명/공지사항을 최신 상태로 맞추고,
//    모든 옵션이 품절인 상품은 자동으로 비공개 전환한다.
// Vercel Cron이 아닌 외부에서 함부로 호출하지 못하도록 CRON_SECRET으로 보호한다.
const IMAGE_RESYNC_TIME_BUDGET_MS = 180_000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const startedAt = Date.now();
  const imageBatches: { updated: number; skipped: number; failed: number; remaining: number }[] = [];

  // 남은 상품이 없어질 때까지, 또는 시간 예산(재고 동기화 몫을 남겨두기 위해)을 넘길 때까지 반복한다.
  while (Date.now() - startedAt < IMAGE_RESYNC_TIME_BUDGET_MS) {
    const result = await runImageResyncBatch(30);
    if (!result.ok) {
      imageBatches.push({ updated: 0, skipped: 0, failed: 0, remaining: 0 });
      break;
    }
    imageBatches.push(result);
    if (result.remaining === 0) break;
  }

  const stockSummary = await runStockAndDescriptionSync().catch((err) => {
    console.error("재고/설명 동기화 실패:", err);
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
    stockSync: stockSummary,
  });
}
