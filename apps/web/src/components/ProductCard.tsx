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
  avgRating?: number;
  reviewCount?: number;
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
      className="group flex flex-col gap-2.5 active:opacity-90 transition-opacity"
    >
      <div className="relative rounded-xl overflow-hidden bg-sand aspect-square">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/30 text-sm">
            이미지 준비중
          </div>
        )}

        {soldOut && (
          <div className="absolute inset-0 bg-background/85 flex items-center justify-center">
            <span className="text-foreground/70 text-sm font-medium">품절</span>
          </div>
        )}

        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} initialWishlisted={product.isWishlisted} size="sm" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-medium text-foreground line-clamp-2">{product.name}</p>
        {!!product.reviewCount && (
          <p className="text-xs text-gold font-medium">
            ★ {product.avgRating!.toFixed(1)} <span className="text-foreground/40">({product.reviewCount})</span>
          </p>
        )}
        <div className="flex items-baseline gap-1.5">
          {hasDiscount && <span className="text-gold text-sm font-bold">{discountPercent}%</span>}
          <span className="font-bold text-foreground">
            {product.minPrice !== null ? formatWon(product.minPrice) : "가격 문의"}
          </span>
        </div>
        {hasDiscount && (
          <span className="text-foreground/40 text-xs line-through">
            {formatWon(product.compareAtPrice!)}
          </span>
        )}
        <span className="text-xs text-foreground/50">무료배송</span>
      </div>
    </Link>
  );
}
