"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export function CartBadge() {
  const { totalCount } = useCart();
  return (
    <Link href="/cart" className="hover:text-primary whitespace-nowrap">
      장바구니{totalCount > 0 ? ` (${totalCount})` : ""}
    </Link>
  );
}
