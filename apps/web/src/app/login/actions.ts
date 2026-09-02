"use server";

import { cookies } from "next/headers";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { REFERRAL_COOKIE_NAME } from "@/lib/points";

export interface LoginState {
  ok: boolean;
  message: string;
}

// 오픈 리다이렉트 방지: "/"로 시작하는 내부 경로만 로그인 후 이동지로 허용한다.
function sanitizeCallbackUrl(url: FormDataEntryValue | null): string {
  const value = String(url ?? "");
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = sanitizeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    throw error;
  }

  return { ok: true, message: "" };
}

// 소셜 로그인은 OAuth 리다이렉트를 거치므로 ref 값을 폼으로 직접 넘길 수 없다.
// 리다이렉트를 넘어서도 살아있도록 짧은 쿠키에 담아두고, 가입 완료 시점(auth.ts의
// createUser 이벤트)에 읽어서 추천 포인트를 지급한다.
async function stashReferralRef(formData: FormData) {
  const ref = String(formData.get("ref") ?? "").trim();
  if (!ref) return;
  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE_NAME, ref, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
}

export async function signInKakaoAction(formData: FormData) {
  await stashReferralRef(formData);
  await signIn("kakao", { redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")) });
}

export async function signInNaverAction(formData: FormData) {
  await stashReferralRef(formData);
  await signIn("naver", { redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")) });
}
