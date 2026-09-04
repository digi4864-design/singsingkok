import { unstable_cache } from "next/cache";
import { prisma, type Category } from "@farm-mall/db";
import { sortCategoriesForStorefront } from "./categoryOrder";
import { getReviewStatsMap } from "./reviewStats";

const SECTION_SIZE = 8;
// 카테고리/추천상품/리뷰통계는 모든 방문자에게 동일하게 보이는 데이터라, 매 요청마다
// DB를 다시 조회하지 않고 짧게 캐시한다. 실제로는 하루 1회 자동동기화 + 가끔 있는 관리자
// 수정 정도라 90초 지연은 체감상 문제되지 않으면서, 리전 정렬 이후에도 남아있던 홈 화면
// 2~3초 지연을 캐시 적중 시 거의 0으로 만든다.
const REVALIDATE_SECONDS = 90;

export interface HomepageSharedData {
  categories: Category[];
  featuredProducts: Awaited<ReturnType<typeof fetchFeaturedProducts>>;
  setting: Awaited<ReturnType<typeof fetchSetting>>;
  reviewStatsEntries: [string, { avgRating: number; count: number }][];
  categorySections: { category: Category; products: Awaited<ReturnType<typeof fetchFeaturedProducts>> }[];
}

// description/supplierNotice는 카드 렌더링에 안 쓰는데, 최고집 원본에 이미지가 base64로
// 통째로 박혀 들어와 상품 하나에 최대 9MB까지 나가는 경우가 있다. include 대신 select로
// 실제 쓰는 필드만 가져와야 조회도 빠르고, 캐시 저장(2MB 제한)도 걸리지 않는다.
function fetchFeaturedProducts() {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    select: {
      id: true,
      name: true,
      displayName: true,
      thumbnailUrl: true,
      options: { select: { sellingPrice: true, compliancePrice: true, isAvailable: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
}

function fetchSetting() {
  return prisma.storeSetting.findUnique({ where: { id: "default" } });
}

export const getHomepageSharedData = unstable_cache(
  async (): Promise<HomepageSharedData> => {
    const categoriesRaw = await prisma.category.findMany({ orderBy: { name: "asc" } });
    const categories = sortCategoriesForStorefront(categoriesRaw);

    const [featuredProducts, setting, reviewStatsMap, categorySections] = await Promise.all([
      fetchFeaturedProducts(),
      fetchSetting(),
      getReviewStatsMap(),
      Promise.all(
        categories.map(async (c) => ({
          category: c,
          products: await prisma.product.findMany({
            where: { isActive: true, categoryId: c.id },
            select: {
              id: true,
              name: true,
              displayName: true,
              thumbnailUrl: true,
              options: { select: { sellingPrice: true, compliancePrice: true, isAvailable: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: SECTION_SIZE,
          }),
        }))
      ),
    ]);

    return {
      categories,
      featuredProducts,
      setting,
      reviewStatsEntries: [...reviewStatsMap.entries()],
      categorySections,
    };
  },
  ["homepage-shared-data-v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["homepage"] }
);
