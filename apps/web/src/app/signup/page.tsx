import { enabledSocialProviders } from "@/lib/auth";
import { signInKakaoAction, signInNaverAction } from "@/app/login/actions";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const social = enabledSocialProviders();
  const hasSocial = social.kakao || social.naver;

  return (
    <main className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">회원가입</h1>
      {ref && (
        <p className="text-center text-xs text-primary bg-primary/10 rounded-lg py-2 mb-4">
          친구의 초대로 가입하면 1,000포인트를 드려요!
        </p>
      )}
      <SignupForm referrerId={ref} />

      {hasSocial && (
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          <p className="text-center text-xs text-gray-400 mb-1">
            소셜 계정으로 간편하게 가입할 수도 있어요
          </p>
          {social.kakao && (
            <form action={signInKakaoAction}>
              <input type="hidden" name="ref" value={ref ?? ""} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-medium text-sm"
                style={{ backgroundColor: "#FEE500", color: "#191919" }}
              >
                카카오로 시작하기
              </button>
            </form>
          )}
          {social.naver && (
            <form action={signInNaverAction}>
              <input type="hidden" name="ref" value={ref ?? ""} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-medium text-sm text-white"
                style={{ backgroundColor: "#03C75A" }}
              >
                네이버로 시작하기
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
