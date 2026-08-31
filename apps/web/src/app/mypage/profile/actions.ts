"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

export interface ProfileState {
  ok: boolean;
  message: string;
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "로그인이 필요합니다." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const addressDetail = String(formData.get("addressDetail") ?? "").trim();

  if (!name) {
    return { ok: false, message: "이름을 입력해주세요." };
  }
  if (phone && !/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) {
    return { ok: false, message: "휴대폰 번호 형식을 확인해주세요. (예: 010-1234-5678)" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone || null,
      zipCode: zipCode || null,
      address: address || null,
      addressDetail: addressDetail || null,
    },
  });

  revalidatePath("/mypage/profile");
  revalidatePath("/mypage");
  return { ok: true, message: "회원정보가 저장되었습니다." };
}

export async function changePasswordAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "로그인이 필요합니다." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") ?? "");

  if (newPassword.length < 8) {
    return { ok: false, message: "새 비밀번호는 8자 이상이어야 합니다." };
  }
  if (newPassword !== newPasswordConfirm) {
    return { ok: false, message: "새 비밀번호가 일치하지 않습니다." };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.passwordHash) {
    return { ok: false, message: "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, message: "현재 비밀번호가 일치하지 않습니다." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return { ok: true, message: "비밀번호가 변경되었습니다." };
}
