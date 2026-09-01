"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";

export interface AddressState {
  ok: boolean;
  message: string;
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("로그인이 필요합니다.");
  return session.user.id;
}

export async function createAddressAction(
  _prev: AddressState,
  formData: FormData
): Promise<AddressState> {
  const userId = await requireUserId();

  const label = String(formData.get("label") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();
  const zipCode = String(formData.get("zipCode") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const addressDetail = String(formData.get("addressDetail") ?? "").trim();

  if (!recipientName || !recipientPhone || !zipCode || !address) {
    return { ok: false, message: "받는 분, 연락처, 주소를 모두 입력해주세요." };
  }

  const existingCount = await prisma.address.count({ where: { userId } });

  await prisma.address.create({
    data: {
      userId,
      label: label || null,
      recipientName,
      recipientPhone,
      zipCode,
      address,
      addressDetail: addressDetail || null,
      isDefault: existingCount === 0, // 첫 배송지는 자동으로 기본 배송지로 지정
    },
  });

  revalidatePath("/mypage/addresses");
  revalidatePath("/checkout");
  return { ok: true, message: "배송지가 저장되었습니다." };
}

export async function deleteAddressAction(formData: FormData) {
  const userId = await requireUserId();
  const addressId = String(formData.get("addressId"));

  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) throw new Error("배송지를 찾을 수 없습니다.");

  await prisma.address.delete({ where: { id: addressId } });

  // 기본 배송지를 삭제했다면 남은 것 중 가장 최근 배송지를 새 기본으로 지정
  if (address.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  revalidatePath("/mypage/addresses");
  revalidatePath("/checkout");
}

export async function setDefaultAddressAction(formData: FormData) {
  const userId = await requireUserId();
  const addressId = String(formData.get("addressId"));

  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) throw new Error("배송지를 찾을 수 없습니다.");

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ]);

  revalidatePath("/mypage/addresses");
  revalidatePath("/checkout");
}
