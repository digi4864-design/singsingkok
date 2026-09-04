"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { postImageToInstagram } from "@/lib/instagram";
import { requireAdmin } from "@/lib/requireAdmin";

export interface PostState {
  ok: boolean;
  message: string;
}

export async function postProductToInstagramAction(_prev: PostState, formData: FormData): Promise<PostState> {
  await requireAdmin();
  const productId = String(formData.get("productId"));
  const caption = String(formData.get("caption") ?? "").trim();

  if (!caption) {
    return { ok: false, message: "문구를 입력해주세요." };
  }

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { thumbnailUrl: true },
  });

  if (!product.thumbnailUrl) {
    return { ok: false, message: "썸네일 이미지가 없는 상품입니다." };
  }

  try {
    await postImageToInstagram(product.thumbnailUrl, caption);
  } catch (err) {
    return { ok: false, message: `게시 실패: ${(err as Error).message}` };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { instagramPostedAt: new Date() },
  });

  revalidatePath("/admin/instagram");
  return { ok: true, message: "인스타그램에 게시되었습니다." };
}
