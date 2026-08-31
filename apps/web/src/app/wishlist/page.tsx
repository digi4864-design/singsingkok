import { redirect } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/wishlist");

  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { options: true } } },
    orderBy: { createdAt: "desc" },
  });

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
                  name: p.displayName ?? p.name,
                  minPrice: cheapest?.sellingPrice ?? null,
                  compareAtPrice: cheapest?.compliancePrice ?? null,
                  hasAvailableOption: availableOptions.length > 0,
                  thumbnailUrl: p.thumbnailUrl,
                  isWishlisted: true,
                }}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
