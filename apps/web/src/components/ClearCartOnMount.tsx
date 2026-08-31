"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

// 주문 확인 페이지는 무통장입금(클라이언트에서 바로 이동)과 카드결제(토스 리다이렉트를
// 거쳐 서버에서 이동) 양쪽 경로로 모두 도달하므로, 여기서 한 번 더 장바구니를 비워준다.
export function ClearCartOnMount() {
  const { clear, hydrated } = useCart();

  useEffect(() => {
    // CartProvider가 localStorage에서 장바구니를 읽어오는 하이드레이션이 끝나기 전에
    // clear()를 호출하면, 뒤이어 하이드레이션이 이전 장바구니 값으로 상태를 덮어써버려
    // 실제로는 비워지지 않는 문제가 있었다. hydrated가 true가 된 뒤에만 비운다.
    if (hydrated) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return null;
}
