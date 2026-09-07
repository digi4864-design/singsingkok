"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackMetaEvent } from "@/lib/metaPixel";

// 주문 확인 페이지는 고객이 나중에 배송조회 등으로 몇 번이고 다시 들어올 수 있어서, 그때마다
// 구매 이벤트를 또 보내면 광고 성과 데이터가 부풀려진다. 결제 성공 직후 리다이렉트에만
// 붙인 ?purchased=1이 있을 때 딱 한 번만 보내고, 즉시 URL에서 지운다(새로고침 시 재전송 방지).
export function TrackPurchase({ orderId, value }: { orderId: string; value: number }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justPurchased = searchParams.get("purchased") === "1";

  useEffect(() => {
    if (!justPurchased) return;
    trackMetaEvent("Purchase", { content_ids: [orderId], value, currency: "KRW" });
    router.replace(`/orders/${orderId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPurchased]);

  return null;
}
