import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 인스타그램 액세스 토큰/계정 ID가 Vercel 환경변수에 정상 등록됐는지 확인하는 임시 점검용 엔드포인트.
// BRIEFING_SECRET을 재사용해 인증한다(별도 시크릿을 새로 만들 필요 없이 기존 관리자용 보호 방식과 동일).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get("token");
  const secret = process.env.BRIEFING_SECRET;
  if (!secret || tokenParam !== secret) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!igToken || !igAccountId) {
    return NextResponse.json({ ok: false, error: "INSTAGRAM_ACCESS_TOKEN 또는 INSTAGRAM_BUSINESS_ACCOUNT_ID가 설정되어 있지 않습니다." }, { status: 500 });
  }

  const res = await fetch(
    `https://graph.instagram.com/v23.0/${igAccountId}?fields=username,media_count,account_type&access_token=${igToken}`,
    { cache: "no-store" }
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, error: data }, { status: 502 });
  }

  return NextResponse.json({ ok: true, account: data });
}
