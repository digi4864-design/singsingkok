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

  // ?media=1을 붙이면 실제 최근 게시물 목록(캡션/시각/링크)도 같이 보여준다 - DB에 기록된
  // instagramPostedAt 개수와 실제 인스타그램 media_count가 어긋날 때(예: 발행 API가 에러를
  // 반환했는데 실제로는 게시가 성공한 경우) 어떤 게시물이 DB에 안 잡혔는지 대조하는 용도.
  if (url.searchParams.get("media") === "1") {
    const mediaRes = await fetch(
      `https://graph.instagram.com/v23.0/${igAccountId}/media?fields=id,caption,timestamp,permalink,media_type&limit=20&access_token=${igToken}`,
      { cache: "no-store" }
    );
    const mediaData = await mediaRes.json();
    return NextResponse.json({ ok: true, account: data, media: mediaData });
  }

  return NextResponse.json({ ok: true, account: data });
}
