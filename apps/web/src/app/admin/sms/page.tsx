import { prisma } from "@farm-mall/db";
import { TIERS } from "@/lib/membership";
import { SmsForm } from "./SmsForm";

export const dynamic = "force-dynamic";

export default async function AdminSmsPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string; q?: string }>;
}) {
  const { tier, q } = await searchParams;

  const users = await prisma.user.findMany({
    where: {
      phone: { not: null },
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
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
    take: 500,
  });

  const nonNullPhoneUsers = users.filter((u): u is { id: string; name: string | null; phone: string } =>
    Boolean(u.phone)
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">문자 발송</h1>
      <p className="text-sm text-gray-500 mb-4">
        선택한 회원들에게 문자(SMS/LMS)를 보냅니다. 광고성 문자는 관련 법규(수신동의, 발송 가능
        시간대 등)를 준수해서 사용해주세요.
      </p>

      <form className="flex gap-2 mb-4" action="/admin/sms">
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

      <SmsForm users={nonNullPhoneUsers} />
    </div>
  );
}
