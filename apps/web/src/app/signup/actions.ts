"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@farm-mall/db";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { awardReferralBonusIfApplicable } from "@/lib/points";
import { notifyAdmins } from "@/lib/push";

export interface SignupState {
  ok: boolean;
  message: string;
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!email || !password || !name) {
    return { ok: false, message: "이메일, 비밀번호, 이름을 모두 입력해주세요." };
  }
  if (password.length < 8) {
    return { ok: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== passwordConfirm) {
    return { ok: false, message: "비밀번호가 일치하지 않습니다." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, message: "이미 가입된 이메일입니다." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: { email, passwordHash, name, phone: phone || null, hasWelcomeCoupon: true },
  });

  const ref = String(formData.get("ref") ?? "").trim();
  await awardReferralBonusIfApplicable(newUser.id, ref);
  await notifyAdmins("새 회원가입", `${name}님이 가입했습니다.`, "/admin/customers");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "가입은 완료되었지만 자동 로그인에 실패했습니다. 로그인해주세요." };
    }
    throw error;
  }

  return { ok: true, message: "" };
}
