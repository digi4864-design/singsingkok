import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import {
  findProductDriveImages,
  uploadImagesToBlob,
  searchChoigozipProductImage,
  uploadChoigozipImageToBlob,
  searchChoigozipProduct,
} from "@farm-mall/sync";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/categoryRules";

export interface ResyncResult {
  ok: boolean;
  message: string;
  updated: number;
  skipped: number;
  failed: number;
  remaining: number;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9가-힣-]/g, "");
}

// 동시성이 너무 높으면 구글 드라이브 파일 다운로드가 "자동화된 요청"으로 감지되어
// 403(봇 차단)을 맞을 수 있어(실제로 겪음) 너무 공격적으로 올리지 않는다.
const CONCURRENCY = 6;
// 상품명이 드라이브 폴더 구조와 잘 안 맞으면(카테고리 힌트 없이 전체 폴더를 뒤져야 해서)
// 한 상품 매칭에만 아주 오래 걸릴 수 있다. 배치 전체가 이 한 상품 때문에 함수 실행시간
// 제한을 넘기지 않도록 상품당 최대 대기 시간을 둔다 — 시간 초과되면 "건너뜀"으로 처리하고
// 다음 배치에서 다시 시도한다.
const PER_PRODUCT_TIMEOUT_MS = 18_000;

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`시간 초과: ${label}`)), ms)),
  ]);
}

const NEEDS_SYNC_WHERE = {
  OR: [
    { thumbnailUrl: null },
    { images: { isEmpty: true } },
    { categoryId: null },
    // 최고집 폴백으로 사진을 1장만 확보한 상품도 후보에 포함시켜, 구글드라이브에 더 나은
    // 사진(4~5장)이 있는지 다시 확인할 기회를 준다.
    { thumbnailSourceKey: { startsWith: "choigozip:" } },
    // "미지정"(엑셀 업로드/관리자 일괄정리 시 붙는 임시 카테고리)도 categoryId가 채워져
    // 있다는 이유로 영영 재시도 안 되는 문제가 있었다 - 다시 후보에 포함시킨다.
    { category: { name: UNASSIGNED_CATEGORY_NAME } },
  ],
};

/**
 * 기존 상품들의 썸네일·상세이미지·카테고리를 구글 드라이브(1순위)와 최고집 공개 검색
 * API(2순위) 기준으로 다시 확인한다. 이미 값이 채워진 항목(수동 업로드 포함)은 건드리지
 * 않고, 비어 있는 항목만 채운다 - 관리자가 직접 등록한 이미지는 절대 자동으로 바뀌지 않는다.
 *
 * 상품당 여러 번의 외부 API 왕복이 필요해 카탈로그 전체를 한 번에 처리하면 서버리스 함수
 * 실행시간 제한을 넘길 수 있으므로, 한 번 호출에 최대 `batchSize`개만 처리하고 남은
 * 개수(remaining)를 돌려준다. 호출부는 remaining이 0이 될 때까지 반복 호출한다.
 */
export async function runImageResyncBatch(batchSize = 15): Promise<ResyncResult> {
  const rootFolderId = process.env.CHOIGOZIP_DRIVE_ROOT_FOLDER_ID;
  if (!process.env.GOOGLE_DRIVE_API_KEY || !rootFolderId) {
    return {
      ok: false,
      message: "GOOGLE_DRIVE_API_KEY가 설정되어 있지 않습니다.",
      updated: 0,
      skipped: 0,
      failed: 0,
      remaining: 0,
    };
  }

  // updatedAt 오름차순 = "가장 오래 전에 시도됐거나 한 번도 시도되지 않은" 상품부터.
  // 매칭에 계속 실패하는 상품도 아래에서 시도 후 updatedAt이 갱신되므로 다음 배치에서는
  // 뒤로 밀려나고, 아직 안 건드린 상품이 먼저 시도된다(같은 실패 상품만 무한 반복되는 것 방지).
  const products = await prisma.product.findMany({
    where: NEEDS_SYNC_WHERE,
    select: {
      id: true,
      name: true,
      thumbnailUrl: true,
      thumbnailSourceKey: true,
      images: true,
      categoryId: true,
      category: { select: { name: true } },
      isActive: true,
    },
    orderBy: { updatedAt: "asc" },
    take: batchSize,
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  await mapWithConcurrency(products, CONCURRENCY, async (product) => {
    // 최고집 공개 검색 API 폴백(아래 157번째 줄 부근)은 사진을 딱 1장만 가져올 수 있다.
    // 그 1장짜리 임시 사진이 먼저 붙어버리면 thumbnailUrl이 채워진 것으로 보여서, 실제로는
    // 구글드라이브에 4~5장짜리 제대로 된 사진 폴더가 있어도 다시는 확인하지 않는 문제가
    // 있었다(실제 사례: "태추단감" - 드라이브엔 사진 4장+상세페이지가 있었는데 최고집
    // 폴백 1장짜리로 막혀서 영영 못 가져왔음). 관리자가 직접 올린 사진(thumbnailSourceKey
    // 없음)이나 이미 드라이브에서 제대로 가져온 사진은 그대로 두고, 최고집 폴백 1장짜리일
    // 때만 드라이브에 더 나은 사진이 있는지 다시 확인한다.
    const hasOnlyWeakFallbackThumbnail = product.thumbnailSourceKey?.startsWith("choigozip:") ?? false;
    const needsThumbnail = !product.thumbnailUrl || hasOnlyWeakFallbackThumbnail;
    const needsDetail = product.images.length === 0;
    // "미지정"으로 일괄배정된 상품도, 진짜 카테고리를 찾을 기회를 다시 준다(그렇지 않으면
    // categoryId가 채워져 있다는 이유만으로 영영 "미지정"에 갇히게 됨).
    const needsCategory = !product.categoryId || product.category?.name === UNASSIGNED_CATEGORY_NAME;

    let hadError = false;
    const data: {
      thumbnailUrl?: string;
      thumbnailImages?: string[];
      thumbnailSourceKey?: string;
      images?: string[];
      categoryId?: string;
      isActive?: boolean;
    } = {};

    // 구글 드라이브 쪽(검색 자체와 파일 다운로드 모두)은 타임아웃이나 봇 차단(403)으로
    // 실패할 수 있는데, 그렇더라도 아래 최고집 공개 API 폴백은 반드시 시도해야 하므로
    // 이 블록만 별도로 감싼다 - 한 단계가 실패해도 나머지 단계는 계속 진행된다.
    try {
      // 카테고리 힌트 없이 전체 드라이브를 뒤지면, 서로 다른 카테고리에 같은 단어가 들어간
      // 폴더끼리 잘못 매칭될 수 있다(실제 사고: 가공식품 "암꽃게장"이 수산물 카테고리의
      // "꽃게"(생물) 폴더 사진을 가져옴 - 카테고리를 몰라 전체를 다 뒤지다 벌어진 일. 카테고리
      // 힌트 기능을 추가한 뒤에도, 최고집 API 호출이 동시요청 부하 등으로 가끔 실패해서
      // categoryHint를 못 구하면 findProductDriveImages가 다시 전체 카테고리를 뒤지다 같은
      // 사고가 재발했다). 그래서 categoryHint를 구하지 못하면 이번 배치에서는 아예 드라이브를
      // 뒤지지 않고 건너뛴다 - 안전한 최고집 단일 이미지 폴백으로만 처리한다.
      const choigozipHit = await searchChoigozipProduct(product.name).catch(() => null);
      const categoryHint = choigozipHit?.categoryName ?? undefined;
      // 최고집 categoryName엔 장식용 이모지가 붙어 있다(예: "🥩축산🥩"). 순수 카테고리명만
      // 추려서, 드라이브에 사진 폴더가 없는 상품(아래 categoryFolder 매칭 실패)도 카테고리는
      // 배정받을 수 있게 한다 - 예전엔 사진 폴더를 찾은 상품만 카테고리를 받아서, 드라이브에
      // 전용 폴더가 없는 품목(고기/수산물 등)은 사진이 있든 없든 "미지정"에 영영 갇혔다.
      const cleanCategoryHint = categoryHint?.replace(/[^가-힣\s]/g, "").trim() || undefined;

      const match = categoryHint
        ? await withTimeout(
            findProductDriveImages(rootFolderId, product.name, categoryHint),
            PER_PRODUCT_TIMEOUT_MS,
            product.name
          )
        : { matched: false, detailImages: [], thumbnailImages: [] };

      if (needsThumbnail && match.thumbnailImages.length > 0) {
        const saved = await uploadImagesToBlob(match.thumbnailImages.slice(0, 5), product.id, "thumb");
        if (saved.length > 0) {
          data.thumbnailImages = saved;
          data.thumbnailUrl = saved[0];
          // 다른 상품이 같은 드라이브 폴더(예: "족발" 그룹 폴더를 여러 상품이 공유)에서
          // 썸네일을 가져왔는지 나중에 점검할 수 있도록 출처를 기록해둔다.
          data.thumbnailSourceKey = match.varietyFolder ? `drive:${match.varietyFolder}` : undefined;
          // 이미지를 못 찾아 비공개 처리됐던 상품이 이번에 썸네일을 확보하면 자동으로 공개 전환
          if (!product.isActive) data.isActive = true;
        }
      }

      if (needsDetail && match.detailImages.length > 0) {
        const saved = await uploadImagesToBlob(match.detailImages, product.id, "detail");
        if (saved.length > 0) data.images = saved;
      }

      const categoryName = match.categoryFolder ?? cleanCategoryHint;
      if (needsCategory && categoryName) {
        const category = await prisma.category.upsert({
          where: { name: categoryName },
          update: {},
          create: { name: categoryName, slug: slugify(categoryName) },
        });
        data.categoryId = category.id;
      }
    } catch (err) {
      console.error(`드라이브 매칭 실패 (${product.name}):`, err);
      hadError = true;
    }

    // 구글 드라이브에 폴더가 아예 없거나, 폴더는 있지만 대표사진이 없거나, 위 단계가
    // 실패했더라도(타임아웃/403 등) 최고집 공개 검색 API로 한 번 더 시도한다
    // (로그인 없이 접근 가능한 공개 엔드포인트라 Cloudflare 봇 차단 위험이 없다).
    if (needsThumbnail && !data.thumbnailUrl) {
      try {
        const hit = await searchChoigozipProductImage(product.name);
        const uploaded = hit ? await uploadChoigozipImageToBlob(hit.imageUrl, product.id) : null;
        if (uploaded && hit) {
          data.thumbnailImages = [uploaded];
          data.thumbnailUrl = uploaded;
          // 서로 다른 우리 상품명이 최고집의 같은 상품 검색결과로 매칭됐는지 점검할 수 있도록 기록.
          data.thumbnailSourceKey = `choigozip:${hit.name}`;
          if (!product.isActive) data.isActive = true;
        }
      } catch (err) {
        console.error(`최고집 이미지 검색 실패 (${product.name}):`, err);
        hadError = true;
      }
    }

    if (Object.keys(data).length === 0) {
      await prisma.product.update({ where: { id: product.id }, data: {} }).catch(() => {});
      if (hadError) failed++;
      else skipped++;
      return;
    }

    await prisma.product.update({ where: { id: product.id }, data });
    updated++;
  });

  const remaining = await prisma.product.count({ where: NEEDS_SYNC_WHERE });

  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    ok: true,
    message: `이번 배치: ${updated}건 갱신, ${skipped}건 건너뜀, ${failed}건 실패`,
    updated,
    skipped,
    failed,
    remaining,
  };
}
