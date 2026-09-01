import { enabledSocialProviders } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { signInKakaoAction, signInNaverAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const social = enabledSocialProviders();
  const hasSocial = social.kakao || social.naver;

  return (
    <main className="max-w-sm mx-auto px-4 py-14">
      <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">로그인</h1>
      <LoginForm callbackUrl={callbackUrl} />

      {hasSocial && (
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          {social.kakao && (
            <form action={signInKakaoAction}>
              <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-medium text-sm"
                style={{ backgroundColor: "#FEE500", color: "#191919" }}
              >
                카카오로 로그인
              </button>
            </form>
          )}
          {social.naver && (
            <form action={signInNaverAction}>
              <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
              <button
                type="submit"
                className="w-full py-3 rounded-lg font-medium text-sm text-white"
                style={{ backgroundColor: "#03C75A" }}
              >
                네이버로 로그인
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}
