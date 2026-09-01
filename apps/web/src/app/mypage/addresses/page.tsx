import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@farm-mall/db";
import { AddressForm } from "./AddressForm";
import { deleteAddressAction, setDefaultAddressAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/mypage/addresses");

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">배송지 관리</h1>
        <Link href="/mypage" className="text-sm text-primary hover:underline">
          마이페이지로
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        자주 쓰는 배송지를 저장해두면 주문할 때 빠르게 선택할 수 있어요.
      </p>

      {addresses.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">저장된 배송지가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-200 border-t border-b border-gray-200 mb-8">
          {addresses.map((a) => (
            <li key={a.id} className="py-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-800">
                  {a.label ? `${a.label} · ` : ""}
                  {a.recipientName}
                  {a.isDefault && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary">
                      기본 배송지
                    </span>
                  )}
                </p>
              </div>
              <p className="text-gray-500">{a.recipientPhone}</p>
              <p className="text-gray-500">
                ({a.zipCode}) {a.address} {a.addressDetail}
              </p>
              <div className="flex gap-3 mt-1.5">
                {!a.isDefault && (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="addressId" value={a.id} />
                    <button type="submit" className="text-xs text-gray-400 hover:text-primary underline">
                      기본 배송지로 설정
                    </button>
                  </form>
                )}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="addressId" value={a.id} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-500 underline">
                    삭제
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressForm />
    </main>
  );
}
