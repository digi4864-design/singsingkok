import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function AuthHeader() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
        <Link href="/login" className="hover:text-primary">
          로그인
        </Link>
        <span className="text-gray-300">|</span>
        <Link href="/signup" className="hover:text-primary">
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
      <Link href="/mypage" className="hover:text-primary">
        {session.user.name ?? "마이페이지"}
      </Link>
      <span className="text-gray-300">|</span>
      <Link href="/mypage#orders" className="hidden sm:inline hover:text-primary">
        주문내역
      </Link>
      <span className="hidden sm:inline text-gray-300">|</span>
      {session.user.role === "ADMIN" && (
        <>
          <Link href="/admin" className="font-medium text-primary hover:text-primary-hover">
            관리자
          </Link>
          <span className="text-gray-300">|</span>
        </>
      )}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button type="submit" className="hover:text-primary">
          로그아웃
        </button>
      </form>
    </div>
  );
}
