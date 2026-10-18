import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

const MAX_ZIP_SIZE = 150 * 1024 * 1024; // 150MB

// 관리자 상품 이미지 "압축파일(zip)" 업로드가 브라우저에서 Vercel Blob으로 직접 올라가도록
// 클라이언트 토큰을 발급하는 라우트 - Server Action의 요청 본문 4.5MB 한도를 피하기 위해
// 쓴다(자세한 이유는 admin/products/[id]/actions.ts의 processProductZipAction 주석 참고).
// 토큰 발급 전 관리자 권한을 반드시 확인해야 한다 - 안 그러면 누구나 이 라우트로 쓰기
// 토큰을 받아 블롭 스토어에 임의로 업로드할 수 있다.
export async function POST(request: Request): Promise<NextResponse> {
  await requireAdmin();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireAdmin();
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_ZIP_SIZE,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
