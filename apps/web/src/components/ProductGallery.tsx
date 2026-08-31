"use client";

import { useState } from "react";
import Image from "next/image";
import { WishlistButton } from "@/components/WishlistButton";

export function ProductGallery({
  images,
  alt,
  soldOut,
  productId,
  isWishlisted,
}: {
  images: string[];
  alt: string;
  soldOut: boolean;
  productId: string;
  isWishlisted: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const activeImage = images[selected];

  return (
    <div>
      <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={alt}
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
        {soldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-lg font-medium">품절</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <WishlistButton productId={productId} initialWishlisted={isWishlisted} />
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setSelected(i)}
              className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 transition ${
                i === selected ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
              }`}
            >
              <Image src={src} alt={`${alt} ${i + 1}`} fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
