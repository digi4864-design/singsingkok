"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

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

export async function signInKakaoAction(formData: FormData) {
  await signIn("kakao", { redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")) });
}

export async function signInNaverAction(formData: FormData) {
  await signIn("naver", { redirectTo: sanitizeCallbackUrl(formData.get("callbackUrl")) });
}
