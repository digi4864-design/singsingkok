"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@farm-mall/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function addBracketAction(formData: FormData) {
  await requireAdmin();
  const minPrice = Number(formData.get("minPrice"));
  const maxPriceRaw = String(formData.get("maxPrice") ?? "").trim();
  const marginPercent = Number(formData.get("marginPercent"));

  if (!Number.isFinite(minPrice) || !Number.isFinite(marginPercent)) {
    throw new Error("최소 가격과 마진율을 올바르게 입력해주세요.");
  }

  await prisma.marginBracket.create({
    data: {
      minPrice,
      maxPrice: maxPriceRaw ? Number(maxPriceRaw) : null,
      marginPercent,
    },
  });

  revalidatePath("/admin/pricing");
}

export async function deleteBracketAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.marginBracket.delete({ where: { id } });
  revalidatePath("/admin/pricing");
}

export interface RecalcResult {
  updated: number;
  skippedManual: number;
}

// 옵션 수가 많아(수천 건) 한 건씩 UPDATE하면 느리므로, 구간 규칙을 SQL CASE 문으로 변환해
// 단일 쿼리로 일괄 반영한다.
export async function recalcAllPricesAction(): Promise<RecalcResult> {
  await requireAdmin();
  const brackets = await prisma.marginBracket.findMany({ orderBy: { minPrice: "asc" } });
  const skippedManual = await prisma.productOption.count({ where: { isPriceManual: true } });

  const params: number[] = [];
  let paramIdx = 1;
  const nextParam = (value: number) => {
    params.push(value);
    return `$${paramIdx++}`;
  };

  const caseWhens = brackets
    .map((b) => {
      const minP = nextParam(b.minPrice);
      const marginP = nextParam(b.marginPercent);
      const lowerBound = `price >= ${minP}`;
      const upperBound = b.maxPrice !== null ? ` AND price < ${nextParam(b.maxPrice)}` : "";
      return `WHEN ${lowerBound}${upperBound} THEN (ROUND(price * (1 + ${marginP}::numeric / 100) / 10) * 10)::int`;
    })
    .join("\n      ");

  const sql = `
    UPDATE "ProductOption"
    SET "sellingPrice" = CASE
      ${caseWhens || ""}
      ELSE price
    END
    WHERE "isPriceManual" = false
  `;

  const updated = await prisma.$executeRawUnsafe(sql, ...params);

  revalidatePath("/admin/pricing");
  revalidatePath("/admin/products");
  revalidatePath("/");

  return { updated, skippedManual };
}
