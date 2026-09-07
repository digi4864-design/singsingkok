import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";
import { getStorefrontName } from "@/lib/productDisplay";
import { ReviewForm } from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

// 마이페이지의 "리뷰 쓰기" 배너를 누르면 상품 상세페이지(사진·가격·설명 등)로 이동해서
// 리뷰 작성란까지 스크롤해야 했는데, 고객 입장에서 "왜 상품 페이지로 왔지" 헷갈릴 수 있다는
// 피드백이 있었다. 리뷰 작성만을 위한 전용 화면을 따로 둬서, 클릭하면 리뷰 쓰는 곳이 바로 뜨게 한다.
export default async function WriteReviewPage(props: PageProps<"/products/[id]/review">) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/products/${id}/review`);

  const [product, myReview] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, displayName: true, thumbnailUrl: true },
    }),
    prisma.review.findUnique({
      where: { userId_productId: { userId: session.user.id, productId: id } },
      select: { rating: true, content: true },
    }),
  ]);

  if (!product) notFound();

  const displayName = getStorefrontName(product);

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <Link href={`/products/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
        ← 상품 페이지로
      </Link>

      <h1 className="text-lg font-bold text-gray-900 mt-3 mb-4">
        {myReview ? "리뷰 수정" : "리뷰 작성"}
      </h1>

      <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-gray-50">
        <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {product.thumbnailUrl && <Image src={product.thumbnailUrl} alt="" fill className="object-cover" />}
        </div>
        <p className="text-sm font-medium text-gray-900">{displayName}</p>
      </div>

      <ReviewForm productId={product.id} existing={myReview} />
    </main>
  );
}
