import { prisma } from "@farm-mall/db";
import { getStorefrontName } from "@/lib/productDisplay";
import { buildDefaultCaption } from "@/lib/instagramCaption";
import { InstagramPostCard } from "./InstagramPostCard";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  name: true,
  displayName: true,
  thumbnailUrl: true,
  thumbnailImages: true,
  createdAt: true,
  instagramPostedAt: true,
  options: { select: { sellingPrice: true } },
} as const;

function minPrice(options: { sellingPrice: number }[]): number | null {
  const prices = options.map((o) => o.sellingPrice).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
}

export default async function AdminInstagramPage() {
  const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const [newProducts, featuredProducts, recentlyPosted] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null }, instagramPostedAt: null, createdAt: { gte: since3d } },
      select: SELECT,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { isActive: true, thumbnailUrl: { not: null }, instagramPostedAt: null, isFeatured: true },
      select: SELECT,
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.product.findMany({
      where: { instagramPostedAt: { not: null } },
      select: { id: true, name: true, displayName: true, instagramPostedAt: true },
      orderBy: { instagramPostedAt: "desc" },
      take: 10,
    }),
  ]);

  const featuredOnly = featuredProducts.filter((p) => !newProducts.some((n) => n.id === p.id));

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">인스타그램 게시</h1>
      <p className="text-sm text-gray-400 mb-6">
        문구를 확인·수정한 뒤 게시 버튼을 누르면 @singsing_kok 계정에 바로 공개 게시됩니다.
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🆕 최근 3일 내 신상품 ({newProducts.length})</h2>
        {newProducts.length === 0 ? (
          <p className="text-sm text-gray-400">게시 대기중인 신상품이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {newProducts.map((p) => (
              <InstagramPostCard
                key={p.id}
                productId={p.id}
                productName={getStorefrontName(p)}
                thumbnailUrl={p.thumbnailUrl!}
                imageCount={p.thumbnailImages.length || 1}
                defaultCaption={buildDefaultCaption(p, minPrice(p.options), true)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">🌞 제철 베스트 상품 ({featuredOnly.length})</h2>
        {featuredOnly.length === 0 ? (
          <p className="text-sm text-gray-400">게시 대기중인 베스트 상품이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {featuredOnly.map((p) => (
              <InstagramPostCard
                key={p.id}
                productId={p.id}
                productName={getStorefrontName(p)}
                thumbnailUrl={p.thumbnailUrl!}
                imageCount={p.thumbnailImages.length || 1}
                defaultCaption={buildDefaultCaption(p, minPrice(p.options), false)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">최근 게시 이력</h2>
        {recentlyPosted.length === 0 ? (
          <p className="text-sm text-gray-400">아직 게시한 상품이 없습니다.</p>
        ) : (
          <ul className="text-sm text-gray-500 space-y-1">
            {recentlyPosted.map((p) => (
              <li key={p.id}>
                {p.instagramPostedAt!.toLocaleString("ko-KR")} · {p.displayName ?? p.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
