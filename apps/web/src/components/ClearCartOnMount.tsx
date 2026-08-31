"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

// 주문 확인 페이지는 무통장입금(클라이언트에서 바로 이동)과 카드결제(토스 리다이렉트를
// 거쳐 서버에서 이동) 양쪽 경로로 모두 도달하므로, 여기서 한 번 더 장바구니를 비워준다.
export function ClearCartOnMount() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
