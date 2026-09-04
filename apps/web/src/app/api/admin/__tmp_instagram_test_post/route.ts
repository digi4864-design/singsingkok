import { NextResponse } from "next/server";
import { prisma } from "@farm-mall/db";
import { postImageToInstagram } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// 인스타그램 자동게시 연동 테스트용 임시 엔드포인트. 확인 후 삭제 예정.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get("token");
  const secret = process.env.BRIEFING_SECRET;
  if (!secret || tokenParam !== secret) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const product = await prisma.product.findFirst({
    where: { isActive: true, thumbnailUrl: { not: null } },
    select: { id: true, name: true, displayName: true, thumbnailUrl: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!product?.thumbnailUrl) {
    return NextResponse.json({ ok: false, error: "썸네일 있는 활성 상품을 찾지 못했습니다." }, { status: 404 });
  }

  const caption = `🥬 싱싱콕 자동게시 테스트입니다!\n이 게시물은 시스템 점검용으로, 확인 후 삭제될 수 있습니다.\n\n(테스트 대상 상품: ${product.displayName ?? product.name})`;

  try {
    const result = await postImageToInstagram(product.thumbnailUrl, caption);
    return NextResponse.json({ ok: true, productId: product.id, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
