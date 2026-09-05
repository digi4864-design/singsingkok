import { NextResponse } from "next/server";
import { runStockAndDescriptionSync } from "@/lib/stockSync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 재고/상세설명 동기화를 daily-sync(이미지 동기화)와 별도 크론으로 분리했다. 원래는 같은
// 함수 실행 안에서 이미지 동기화(최대 180초) 다음에 실행됐는데, 전체 실행시간 제한(300초)을
// 같이 나눠 쓰다 보니 상품이 많을 때 뒤쪽 상품들이 제한 시간 내에 차례가 오지 않아 며칠씩
// 상세설명이 갱신 안 되는 문제가 실제로 있었다(2026-09-06, "태추단감" 등 8/29 대량등록
// 상품 100여개가 일주일 가까이 설명을 못 받아온 사고로 발견). 별도 크론으로 분리해
// 이미지 동기화와 시간 예산을 공유하지 않도록 한다.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const summary = await runStockAndDescriptionSync().catch((err) => {
    console.error("재고/설명 동기화 실패:", err);
    return null;
  });

  return NextResponse.json({ ok: true, stockSync: summary });
}
