"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { applyCategoryRules } from "@/lib/categoryRules";
import { requireAdmin } from "@/lib/requireAdmin";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("카테고리 이름을 입력해주세요.");

  await prisma.category.create({
    data: { name, slug: slugify(name) },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function renameCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("카테고리 이름을 입력해주세요.");

  await prisma.category.update({
    where: { id },
    data: { name, slug: slugify(name) },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));

  await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id } });

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function runCategoryRulesAction() {
  await requireAdmin();
  const result = await applyCategoryRules();

  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/");

  return result;
}

export async function bulkSetOriginAction(formData: FormData) {
  await requireAdmin();
  const categoryId = String(formData.get("categoryId") ?? "");
  const origin = String(formData.get("origin") ?? "").trim();
  const onlyEmpty = formData.get("onlyEmpty") === "on";

  if (!categoryId) throw new Error("카테고리를 선택해주세요.");
  if (!origin) throw new Error("원산지를 입력해주세요.");

  const result = await prisma.product.updateMany({
    where: { categoryId, ...(onlyEmpty ? { origin: null } : {}) },
    data: { origin },
  });

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/");

  return { count: result.count };
}

export async function bulkMoveCategoryAction(formData: FormData) {
  await requireAdmin();
  const productIds = formData.getAll("productIds").map(String);
  const targetCategoryId = String(formData.get("targetCategoryId") ?? "");

  if (productIds.length === 0) {
    throw new Error("이동할 상품을 선택해주세요.");
  }

  await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { categoryId: targetCategoryId || null },
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
}
