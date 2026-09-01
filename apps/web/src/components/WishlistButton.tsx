"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleWishlistAction } from "@/app/wishlist/actions";

export function WishlistButton({
  productId,
  initialWishlisted,
  size = "md",
}: {
  productId: string;
  initialWishlisted: boolean;
  size?: "sm" | "md";
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const res = await toggleWishlistAction(productId);
      if (!res.ok) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }
      setWishlisted(res.wishlisted);
    });
  }

  const dim = size === "sm" ? "w-7 h-7 text-sm" : "w-9 h-9 text-lg";

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label="찜하기"
      className={`${dim} rounded-full bg-white/90 shadow flex items-center justify-center transition-transform active:scale-90 shrink-0`}
    >
      <span className={wishlisted ? "text-red-500" : "text-gray-400"}>{wishlisted ? "♥" : "♡"}</span>
    </button>
  );
}
