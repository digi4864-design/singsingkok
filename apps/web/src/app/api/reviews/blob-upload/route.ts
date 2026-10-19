import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MAX_REVIEW_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB - reviewActions.ts의 서버측 제한과 동일

// 고객 리뷰 사진이 브라우저에서 Vercel Blob으로 직접 올라가도록 클라이언트 토큰을 발급하는
// 라우트 - Server Action 요청 본문의 4.5MB 플랫폼 한도 때문에 고화질 사진을 첨부하면
// 업로드가 통째로 실패하고(입력하던 리뷰 내용까지 같이 날아감) 했던 문제를 피하기 위해
// 쓴다(관리자 상품이미지 업로드와 동일한 패턴, admin/blob-upload 참고). 로그인한 고객이면
// 누구나 토큰을 받을 수 있지만(관리자 권한 불필요), 로그인 자체는 반드시 확인해야 한다.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const s = await auth();
        if (!s?.user) throw new Error("로그인이 필요합니다.");
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_REVIEW_IMAGE_SIZE,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
