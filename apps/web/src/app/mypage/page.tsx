import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { getNextTier } from "@/lib/membership";
import { TierBadge } from "@/components/TierBadge";
import { ReferralLinkBox } from "./ReferralLinkBox";

const POINT_TX_LABEL: Record<string, string> = {
  REFERRAL_BONUS: "친구 추천 적립",
  REFERRED_SIGNUP_BONUS: "추천 가입 적립",
  ORDER_REDEMPTION: "주문 결제 사용",
  ORDER_REFUND: "주문 취소 환급",
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "결제대기",
  PAID: "결제완료",
  PREPARING: "배송준비중",
  SHIPPING: "배송중",
  DELIVERED: "배송완료",
  RETURN_REQUESTED: "반품요청",
  CANCELED: "취소됨",
};

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/mypage");

  const [orders, user, pointTransactions, headersList] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: session.user.id },
      include: { items: { include: { shipment: true }, orderBy: { lineNo: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { totalSpent: true, membershipTier: true, points: true },
    }),
    prisma.pointTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    headers(),
  ]);
  const next = getNextTier(user.totalSpent);
  const host = headersList.get("host") ?? "www.singsingkok.co.kr";
  const protocol = host.includes("localhost") ? "http" : "https";
  const referralUrl = `${protocol}://${host}/signup?ref=${session.user.id}`;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">마이페이지</h1>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {session.user.name}
          {session.user.email ? ` (${session.user.email})` : ""}
        </p>
        <div className="flex gap-3">
          <Link href="/mypage/addresses" className="text-sm text-primary hover:underline">
            배송지 관리
          </Link>
          <Link href="/mypage/profile" className="text-sm text-primary hover:underline">
            회원정보 수정
          </Link>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <TierBadge tier={user.membershipTier} />
          <p className="text-sm text-gray-500">
            누적 구매금액 <span className="font-semibold text-gray-900">{formatWon(user.totalSpent)}</span>
          </p>
        </div>
        {next ? (
          <>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  width: `${Math.min(100, (user.totalSpent / next.info.minAmount) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {next.info.emoji} {next.info.label} 등급까지 {formatWon(next.remaining)} 남았어요
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400 mt-1.5">최고 등급이에요! 🎉</p>
        )}
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">💰 내 포인트</p>
          <p className="text-lg font-bold text-primary">{formatWon(user.points)}P</p>
        </div>

        <p className="text-xs text-gray-500 mb-1.5">
          친구를 초대하면 친구와 나 모두 1,000포인트를 받아요!
        </p>
        <ReferralLinkBox referralUrl={referralUrl} />

        {pointTransactions.length > 0 && (
          <details className="mt-3 text-xs">
            <summary className="text-gray-500 cursor-pointer select-none">포인트 내역 보기</summary>
            <ul className="mt-2 divide-y divide-gray-100">
              {pointTransactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-1.5 text-gray-600">
                  <span>
                    {POINT_TX_LABEL[t.type] ?? t.type}
                    <span className="text-gray-400 ml-1">
                      {t.createdAt.toLocaleDateString("ko-KR")}
                    </span>
                  </span>
                  <span className={t.amount >= 0 ? "text-primary" : "text-gray-500"}>
                    {t.amount >= 0 ? "+" : ""}
                    {formatWon(t.amount)}P
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <h2 id="orders" className="text-sm font-semibold text-gray-700 mb-2 scroll-mt-20">주문 내역</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">주문 내역이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
          {orders.map((o) => (
            <li key={o.id} className="py-3">
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-gray-800">
                    {o.items[0]?.productName}
                    {o.items.length > 1 ? ` 외 ${o.items.length - 1}건` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{o.createdAt.toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatWon(o.totalAmount)}</p>
                  <p className="text-xs text-gray-500">{STATUS_LABEL[o.status] ?? o.status}</p>
                  {(() => {
                    const shipped = o.items.filter(
                      (item) => item.shipment?.trackingNumber && item.shipment.status !== "READY"
                    );
                    if (shipped.length === 0) return null;
                    return (
                      <p className="text-[11px] text-gray-400">
                        {shipped[0].shipment!.courier} {shipped[0].shipment!.trackingNumber}
                        {shipped.length > 1 ? ` 외 ${shipped.length - 1}건` : ""}
                      </p>
                    );
                  })()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
