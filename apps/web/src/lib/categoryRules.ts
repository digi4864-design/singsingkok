import { prisma } from "@farm-mall/db";

export const UNASSIGNED_CATEGORY_NAME = "미지정";
const EUNHASU_PREFIX = "[은하수산]";
const EUNHASU_CATEGORY_NAME = "은하수산";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

/**
 * 상품명이 "[은하수산]"으로 시작하는 상품은 전용 카테고리로, 카테고리가 없는 상품은
 * "미지정" 카테고리로 일괄 배정한다. 엑셀 업로드 직후와 관리자 수동 실행 양쪽에서 사용.
 */
export async function applyCategoryRules(): Promise<{ eunhasu: number; unassigned: number }> {
  const eunhasuCategory = await prisma.category.upsert({
    where: { name: EUNHASU_CATEGORY_NAME },
    update: {},
    create: { name: EUNHASU_CATEGORY_NAME, slug: slugify(EUNHASU_CATEGORY_NAME) },
  });
  const unassignedCategory = await prisma.category.upsert({
    where: { name: UNASSIGNED_CATEGORY_NAME },
    update: {},
    create: { name: UNASSIGNED_CATEGORY_NAME, slug: slugify(UNASSIGNED_CATEGORY_NAME) },
  });

  // 주의: categoryId는 nullable이라 Prisma의 `not: eunhasuCategory.id` 조건을 걸면
  // SQL의 NULL 비교 규칙상 categoryId가 null인 행이 매칭에서 제외된다. 그래서 조건 없이
  // 이름으로만 걸러 전부 재배정한다 (이미 같은 카테고리인 행을 다시 쓰는 정도는 무해함).
  const eunhasuResult = await prisma.product.updateMany({
    where: { name: { startsWith: EUNHASU_PREFIX } },
    data: { categoryId: eunhasuCategory.id },
  });

  const unassignedResult = await prisma.product.updateMany({
    where: { categoryId: null },
    data: { categoryId: unassignedCategory.id },
  });

  return { eunhasu: eunhasuResult.count, unassigned: unassignedResult.count };
}
