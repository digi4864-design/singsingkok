"use server";

import { auth } from "@/lib/auth";
import { syncCartActivity, type CartActivityItem } from "@/lib/cartActivity";

// 클라이언트 장바구니(cart-context.tsx)가 바뀔 때마다 호출한다. 비로그인 사용자는 조용히
// 무시한다(리마인드 알림은 로그인 회원에게만 보낼 수 있으므로).
export async function syncCartActivityAction(items: CartActivityItem[]) {
  const session = await auth();
  if (!session?.user) return;
  await syncCartActivity(session.user.id, items).catch((err) => {
    console.error("장바구니 활동 기록 실패:", err);
  });
}
