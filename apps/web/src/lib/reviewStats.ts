import { prisma } from "@farm-mall/db";

export interface ReviewStats {
  avgRating: number;
  count: number;
}

// 상품 목록 카드에 별점을 보여주기 위한 상품별 평균 평점/리뷰수 집계.
// 매장 규모상 리뷰 테이블 전체가 작아 상품 id로 필터링하지 않고 한 번에 가져온다.
export async function getReviewStatsMap(): Promise<Map<string, ReviewStats>> {
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    grouped.map((g) => [g.productId, { avgRating: g._avg.rating ?? 0, count: g._count._all }])
  );
}
