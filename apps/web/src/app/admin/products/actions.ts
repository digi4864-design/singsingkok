"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

// productId는 .bind()로 미리 고정해서 넘긴다. 같은 <form> 안에 다른 기본 action(예:
// bulkMoveCategoryAction)이 있을 때, 버튼의 formAction과 name/value를 함께 쓰면
// React가 액션 라우팅을 위해 그 name을 내부적으로 덮어써서 값이 전달되지 않는 문제가 있었다.
export async function toggleProductActiveAction(productId: string, _formData: FormData) {
  await requireAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: !product.isActive },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function toggleProductFeaturedAction(productId: string, _formData: FormData) {
  await requireAdmin();
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  await prisma.product.update({
    where: { id: productId },
    data: { isFeatured: !product.isFeatured },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
}
