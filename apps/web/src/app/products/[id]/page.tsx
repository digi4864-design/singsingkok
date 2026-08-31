import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { OptionSelector } from "@/components/OptionSelector";
import { WishlistButton } from "@/components/WishlistButton";
import { ReviewForm } from "@/components/ReviewForm";
import { auth } from "@/lib/auth";

export default async function ProductDetailPage(props: PageProps<"/products/[id]">) {
  const { id } = await props.params;

  const [product, session] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { category: true, options: { orderBy: { sellingPrice: "asc" } } },
    }),
    auth(),
  ]);

  if (!product || !product.isActive) notFound();

  const [isWishlisted, reviews] = await Promise.all([
    session?.user
      ? prisma.wishlist
          .findUnique({
            where: { userId_productId: { userId: session.user.id, productId: product.id } },
          })
          .then(Boolean)
      : Promise.resolve(false),
    prisma.review.findMany({
      where: { productId: product.id, isHidden: false },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const myReview = session?.user
    ? reviews.find((r) => r.userId === session.user!.id)
    : undefined;
  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const galleryImages =
    product.images.length > 0 ? product.images : product.thumbnailUrl ? [product.thumbnailUrl] : [];
  const hasAvailableOption = product.options.some((o) => o.isAvailable);
  const displayName = product.displayName ?? product.name;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt={displayName}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              이미지 준비중
            </div>
          )}
          {!hasAvailableOption && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white text-lg font-medium">품절</span>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <WishlistButton productId={product.id} initialWishlisted={isWishlisted} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            {product.category && (
              <p className="text-sm text-primary font-medium">{product.category.name}</p>
            )}
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
              무료배송
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{displayName}</h1>

          {avgRating !== null && (
            <p className="text-sm text-amber-500 mb-1">
              ★ {avgRating.toFixed(1)} <span className="text-gray-400">({reviews.length}개 리뷰)</span>
            </p>
          )}

          <p className="text-xs text-gray-400 mb-6">
            원산지: {product.origin ?? "상품 상세페이지 참고 (미표기 시 판매자에게 문의)"}
          </p>

          <OptionSelector
            product={{ id: product.id, name: displayName, thumbnailUrl: product.thumbnailUrl }}
            options={product.options.map((o) => ({
              id: o.id,
              optionName: o.optionName,
              price: o.sellingPrice,
              compliancePrice: o.compliancePrice,
              isAvailable: o.isAvailable,
            }))}
          />
        </div>
      </div>

      {galleryImages.length > 0 && (
        <section className="mt-16">
          <h2 className="text-lg font-bold text-gray-900 mb-4">상세정보</h2>
          <div className="flex flex-col">
            {galleryImages.map((src, i) => (
              <div key={src} className="relative w-full">
                <Image
                  src={src}
                  alt={`${displayName} 상세이미지 ${i + 1}`}
                  width={1000}
                  height={1000}
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 max-w-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          상품 리뷰{" "}
          {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
        </h2>

        {session?.user ? (
          <div className="mb-6">
            <ReviewForm
              productId={product.id}
              existing={myReview ? { rating: myReview.rating, content: myReview.content } : null}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-6">
            <Link href={`/login?callbackUrl=/products/${product.id}`} className="text-primary hover:underline">
              로그인
            </Link>{" "}
            후 리뷰를 작성할 수 있습니다.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">아직 등록된 리뷰가 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 text-sm">{"★".repeat(r.rating)}</span>
                  <span className="text-xs text-gray-400">{r.user.name ?? "구매자"}</span>
                  <span className="text-xs text-gray-300">
                    {r.createdAt.toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
