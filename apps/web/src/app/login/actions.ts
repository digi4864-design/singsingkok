"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export interface LoginState {
  ok: boolean;
  message: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }
    throw error;
  }

  return { ok: true, message: "" };
}

export async function signInKakaoAction() {
  await signIn("kakao", { redirectTo: "/" });
}

export async function signInNaverAction() {
  await signIn("naver", { redirectTo: "/" });
}
