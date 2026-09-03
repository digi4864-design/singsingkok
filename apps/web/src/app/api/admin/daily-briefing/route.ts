import { NextResponse } from "next/server";
import { prisma } from "@farm-mall/db";
import { getStorefrontName } from "@/lib/productDisplay";

export const dynamic = "force-dynamic";

// 마케팅팀·CS팀 예약 에이전트가 매일 아침 확인하는 요약 데이터.
// Vercel Cron과 동일한 방식으로 BRIEFING_SECRET 없이는 호출할 수 없게 막는다.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.BRIEFING_SECRET || authHeader !== `Bearer ${process.env.BRIEFING_SECRET}`) {
    return NextResponse.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [newProducts, featuredProducts, setting, lowRatedReviews, returnRequests] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, createdAt: { gte: since24h } },
      include: { options: { select: { sellingPrice: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { options: { select: { sellingPrice: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    prisma.review.findMany({
      where: { rating: { lte: 2 }, isHidden: false, createdAt: { gte: since7d } },
      include: { product: { select: { name: true, displayName: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { status: "RETURN_REQUESTED" },
      select: { id: true, orderNo: true, recipientName: true, returnReason: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  function cardData(p: (typeof newProducts)[number]) {
    const prices = p.options.map((o) => o.sellingPrice).filter((n) => n > 0);
    return {
      id: p.id,
      name: getStorefrontName(p),
      thumbnailUrl: p.thumbnailUrl,
      minPrice: prices.length ? Math.min(...prices) : null,
      url: `https://www.singsingkok.co.kr/products/${p.id}`,
    };
  }

  return NextResponse.json({
    date: new Date().toISOString().slice(0, 10),
    marketing: {
      newProductsLast24h: newProducts.map(cardData),
      featuredProducts: featuredProducts.map(cardData),
      promoBanner: {
        enabled: setting?.promoBannerEnabled ?? false,
        text: setting?.promoBannerText ?? null,
        link: setting?.promoBannerLink ?? null,
      },
    },
    cs: {
      lowRatedReviewsLast7d: lowRatedReviews.map((r) => ({
        id: r.id,
        productName: r.product.displayName ?? r.product.name,
        rating: r.rating,
        content: r.content,
        userName: r.user.name ?? "구매자",
        createdAt: r.createdAt,
      })),
      returnRequests: returnRequests.map((o) => ({
        orderId: o.id,
        orderNo: o.orderNo,
        recipientName: o.recipientName,
        returnReason: o.returnReason,
        updatedAt: o.updatedAt,
        adminUrl: `https://www.singsingkok.co.kr/admin/orders/${o.id}`,
      })),
    },
  });
}
