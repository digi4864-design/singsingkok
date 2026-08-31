import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { TierBadge } from "@/components/TierBadge";
import { TIERS } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; q?: string }>;
}) {
  const { tier, q } = await searchParams;

  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(tier ? { membershipTier: tier as never } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { totalSpent: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      totalSpent: true,
      membershipTier: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">회원 관리</h1>
        <p className="text-sm text-gray-400">{users.length}명 표시 중</p>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        누적 구매금액(취소 제외)에 따라 등급이 자동으로 올라갑니다. 등급 기준: 🌱 새싹(0원) → 🍃
        잎새(10만원) → 🍎 열매(30만원) → 🏆 황금열매(70만원)
      </p>

      <form className="flex gap-2 mb-4" action="/admin/customers">
        <input
          name="q"
          defaultValue={q}
          placeholder="이름/이메일 검색"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56"
        />
        <select
          name="tier"
          defaultValue={tier ?? ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 등급</option>
          {TIERS.map((t) => (
            <option key={t.tier} value={t.tier}>
              {t.emoji} {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 hover:border-primary"
        >
          검색
        </button>
      </form>

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">이름</th>
            <th className="text-left px-4 py-2 font-medium">이메일</th>
            <th className="text-left px-4 py-2 font-medium">연락처</th>
            <th className="text-left px-4 py-2 font-medium">등급</th>
            <th className="text-left px-4 py-2 font-medium">누적 구매금액</th>
            <th className="text-left px-4 py-2 font-medium">주문 수</th>
            <th className="text-left px-4 py-2 font-medium">가입일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                조건에 맞는 회원이 없습니다.
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2">{u.name ?? "-"}</td>
              <td className="px-4 py-2 text-gray-500">{u.email}</td>
              <td className="px-4 py-2 text-gray-500">{u.phone ?? "-"}</td>
              <td className="px-4 py-2">
                <TierBadge tier={u.membershipTier} />
              </td>
              <td className="px-4 py-2 font-medium">{formatWon(u.totalSpent)}</td>
              <td className="px-4 py-2 text-gray-500">{u._count.orders}건</td>
              <td className="px-4 py-2 text-gray-400 text-xs">
                {u.createdAt.toLocaleDateString("ko-KR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
