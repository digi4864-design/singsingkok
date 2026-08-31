import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@farm-mall/db";
import { ProfileInfoForm, ChangePasswordForm } from "./ProfileForms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/mypage/profile");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <Link href="/mypage" className="text-sm text-gray-400 hover:text-primary">
        ← 마이페이지
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mt-2 mb-1">회원정보 수정</h1>
      <p className="text-sm text-gray-500 mb-6">{user.email}</p>

      <h2 className="text-sm font-semibold text-gray-700 mb-2">기본 정보</h2>
      <div className="mb-8">
        <ProfileInfoForm
          name={user.name ?? ""}
          phone={user.phone ?? ""}
          zipCode={user.zipCode ?? ""}
          address={user.address ?? ""}
          addressDetail={user.addressDetail ?? ""}
        />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-2">비밀번호 변경</h2>
      {user.passwordHash ? (
        <ChangePasswordForm />
      ) : (
        <p className="text-sm text-gray-400 border border-gray-200 rounded-lg p-4">
          소셜 로그인으로 가입한 계정은 별도의 비밀번호가 없습니다.
        </p>
      )}
    </main>
  );
}
