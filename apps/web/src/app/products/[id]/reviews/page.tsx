import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { getStorefrontName } from "@/lib/productDisplay";
import { ReviewList } from "@/components/ReviewList";

export const dynamic = "force-dynamic";

// 상품 상세페이지는 사진·설명·옵션 등으로 리뷰까지 내려가려면 한참 스크롤해야 한다.
// "리뷰 보기"를 누르면 리뷰만 모아서 바로 볼 수 있는 전용 화면을 따로 둔다.
export default async function ProductReviewsPage(props: PageProps<"/products/[id]/reviews">) {
  const { id } = await props.params;

  const [product, reviews] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, displayName: true, thumbnailUrl: true },
    }),
    prisma.review.findMany({
      where: { productId: id, isHidden: false },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!product) notFound();

  const displayName = getStorefrontName(product);
  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/products/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
        ← 상품 페이지로
      </Link>

      <div className="flex items-center gap-3 mt-3 mb-2">
        <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {product.thumbnailUrl && <Image src={product.thumbnailUrl} alt="" fill className="object-cover" />}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          {avgRating !== null && (
            <p className="text-sm text-amber-500">
              ★ {avgRating.toFixed(1)} <span className="text-gray-400">({reviews.length}개 리뷰)</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 mt-6">
        <h1 className="text-lg font-bold text-gray-900">상품 리뷰</h1>
        <Link href={`/products/${id}/review`} className="text-sm text-primary hover:underline">
          리뷰 쓰기 →
        </Link>
      </div>

      <ReviewList reviews={reviews} />
    </main>
  );
}
