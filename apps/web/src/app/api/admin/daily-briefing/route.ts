import { NextResponse } from "next/server";
import { getDailyBriefingData } from "@/lib/dailyBriefing";

export const dynamic = "force-dynamic";

// 마케팅팀·CS팀 예약 에이전트가 매일 아침 확인하는 요약 데이터.
// Vercel Cron과 동일한 방식으로 BRIEFING_SECRET 없이는 호출할 수 없게 막는다.
// (실제로는 클라우드 예약 에이전트 샌드박스가 임의 아웃바운드 요청을 조직 정책으로 막아서
// 이 엔드포인트를 직접 호출하지는 못하고, 대신 /api/cron/publish-briefing이 같은 데이터를
// 저장소 파일로 기록해두면 예약 에이전트가 그 파일을 읽는다. 이 API는 관리자가 직접
// 확인하거나 다른 도구에서 조회할 때를 위해 남겨둔다.)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const tokenParam = url.searchParams.get("token");
  const secret = process.env.BRIEFING_SECRET;
  const authorized = Boolean(secret) && (authHeader === `Bearer ${secret}` || tokenParam === secret);
  if (!authorized) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const data = await getDailyBriefingData();
  return NextResponse.json(data);
}
