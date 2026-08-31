import Image from "next/image";
import Link from "next/link";
import { formatWon } from "@/lib/format";
import { WishlistButton } from "@/components/WishlistButton";

export interface ProductCardData {
  id: string;
  name: string;
  minPrice: number | null;
  compareAtPrice: number | null; // 정가(준수판매가) - minPrice보다 높을 때만 할인 표시
  hasAvailableOption: boolean;
  thumbnailUrl: string | null;
  isWishlisted: boolean;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const soldOut = !product.hasAvailableOption;
  const hasDiscount =
    product.compareAtPrice !== null &&
    product.minPrice !== null &&
    product.compareAtPrice > product.minPrice;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.minPrice! / product.compareAtPrice!) * 100)
    : 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block relative rounded-xl overflow-hidden bg-gray-100 aspect-square transition-transform active:scale-[0.97]"
    >
      {product.thumbnailUrl ? (
        <Image
          src={product.thumbnailUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">
          이미지 준비중
        </div>
      )}

      {soldOut && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <span className="text-white text-sm font-medium">품절</span>
        </div>
      )}

      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary text-white">
          무료배송
        </span>
      </div>

      <div className="absolute top-2 right-2">
        <WishlistButton productId={product.id} initialWishlisted={product.isWishlisted} size="sm" />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 pb-2.5">
        <p className="text-white text-sm font-medium line-clamp-2 drop-shadow">{product.name}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {hasDiscount && <span className="text-amber-400 text-sm font-bold">{discountPercent}%</span>}
          <span className="text-white font-bold">
            {product.minPrice !== null ? formatWon(product.minPrice) : "가격 문의"}
          </span>
        </div>
        {hasDiscount && (
          <span className="text-gray-300 text-xs line-through">
            {formatWon(product.compareAtPrice!)}
          </span>
        )}
      </div>
    </Link>
  );
}
