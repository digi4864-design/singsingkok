import { prisma } from "@farm-mall/db";
import { searchChoigozipProduct } from "@farm-mall/sync";

export const UNASSIGNED_CATEGORY_NAME = "미지정";
const EUNHASU_PREFIX = "[은하수산]";
const EUNHASU_CATEGORY_NAME = "은하수산";

// 엑셀 업로드 한 번에 카테고리가 빈 상품이 이 개수를 넘으면(평소보다 훨씬 큰 일괄 등록 등)
// 최고집 조회를 전부 생략하고 예전처럼 "미지정"에 담아둔다 - 그래야 업로드 자체가 느려져서
// Vercel 함수 실행시간 제한에 걸리는 일(실제로 겪었던 문제, 그래서 이미지 동기화를 별도
// 액션으로 뺐었다)을 피할 수 있다. 평소 업로드는 신규 상품이 보통 수십 건 수준이라 이
// 한도 안에서 안전하게 즉시 카테고리까지 채워진다. 한도를 넘긴 나머지는 "미지정"으로
// 남고, 관리자가 "이미지/카테고리 재점검" 버튼으로 나눠서 처리하면 된다.
const MAX_LOOKUP_COUNT = 60;
const LOOKUP_TIMEOUT_MS = 6_000;
const LOOKUP_CONCURRENCY = 8;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

// 최고집 categoryName엔 장식용 이모지가 붙어 있다(예: "🥕농산물🥕") - 순수 카테고리명만 추린다.
function cleanCategoryName(raw: string): string {
  return raw.replace(/[^가-힣\s]/g, "").trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

/**
 * 상품명이 "[은하수산]"으로 시작하는 상품은 전용 카테고리로 배정한다. 카테고리가 없는
 * 나머지 상품은 최고집 공개 검색 API의 categoryName으로 실제 카테고리 자동 배정을 먼저
 * 시도하고(건수가 너무 많지 않을 때만), 거기서도 못 찾은 상품만 "미지정"에 남긴다.
 * 엑셀 업로드 직후와 관리자 수동 실행("이미지/카테고리 재점검") 양쪽에서 사용.
 */
export async function applyCategoryRules(): Promise<{
  eunhasu: number;
  unassigned: number;
  autoAssigned: number;
}> {
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

  const needsCategory = await prisma.product.findMany({
    where: { categoryId: null },
    select: { id: true, name: true },
  });

  let autoAssigned = 0;
  if (needsCategory.length > 0 && needsCategory.length <= MAX_LOOKUP_COUNT) {
    const categoryIdByName = new Map<string, string>();
    await mapWithConcurrency(needsCategory, LOOKUP_CONCURRENCY, async (p) => {
      try {
        const hit = await withTimeout(searchChoigozipProduct(p.name), LOOKUP_TIMEOUT_MS);
        const cleanName = hit?.categoryName ? cleanCategoryName(hit.categoryName) : "";
        if (!cleanName) return;

        let categoryId = categoryIdByName.get(cleanName);
        if (!categoryId) {
          const category = await prisma.category.upsert({
            where: { name: cleanName },
            update: {},
            create: { name: cleanName, slug: slugify(cleanName) },
          });
          categoryId = category.id;
          categoryIdByName.set(cleanName, categoryId);
        }
        await prisma.product.update({ where: { id: p.id }, data: { categoryId } });
        autoAssigned++;
      } catch {
        // 최고집 조회 실패(타임아웃/일시 오류 등)는 조용히 건너뛰고 "미지정"으로 남긴다
        // (아래 unassignedResult가 이어받아 처리) - 엑셀 업로드 자체가 실패하면 안 된다.
      }
    });
  }

  // 자동배정되지 않고 남은 것(또는 건수가 너무 많아 아예 건너뛴 경우)은 기존처럼 미지정으로.
  const unassignedResult = await prisma.product.updateMany({
    where: { categoryId: null },
    data: { categoryId: unassignedCategory.id },
  });

  return { eunhasu: eunhasuResult.count, unassigned: unassignedResult.count, autoAssigned };
}
