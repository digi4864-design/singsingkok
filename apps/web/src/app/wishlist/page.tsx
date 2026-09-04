import { redirect } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";
import { ProductCard } from "@/components/ProductCard";
import { getStorefrontName } from "@/lib/productDisplay";
import { getReviewStatsMap } from "@/lib/reviewStats";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/wishlist");

  const [items, reviewStats] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId: session.user.id },
      // description 등 무거운 필드(최고집 원본에 이미지가 base64로 박혀 최대 9MB)까지
      // 딸려오지 않도록 카드 렌더링에 실제로 쓰는 필드만 select한다.
      include: {
        product: {
          select: {
            id: true,
            name: true,
            displayName: true,
            thumbnailUrl: true,
            options: { select: { sellingPrice: true, compliancePrice: true, isAvailable: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getReviewStatsMap(),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">찜한 상품</h1>

      {items.length === 0 ? (
        <p className="text-center text-gray-400 py-24">찜한 상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(({ product: p }) => {
            const availableOptions = p.options.filter((o) => o.isAvailable);
            const priceSource = availableOptions.length > 0 ? availableOptions : p.options;
            const cheapest =
              priceSource.length > 0
                ? priceSource.reduce((min, o) => (o.sellingPrice < min.sellingPrice ? o : min))
                : null;
            return (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: getStorefrontName(p),
                  minPrice: cheapest?.sellingPrice ?? null,
                  compareAtPrice: cheapest?.compliancePrice ?? null,
                  hasAvailableOption: availableOptions.length > 0,
                  thumbnailUrl: p.thumbnailUrl,
                  isWishlisted: true,
                  avgRating: reviewStats.get(p.id)?.avgRating,
                  reviewCount: reviewStats.get(p.id)?.count,
                }}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
