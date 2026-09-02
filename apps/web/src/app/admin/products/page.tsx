import Image from "next/image";
import Link from "next/link";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { toggleProductActiveAction, toggleProductFeaturedAction } from "./actions";
import { bulkMoveCategoryAction } from "../categories/actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const [categories, products, sharedThumbnailGroups] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { displayName: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(category ? { categoryId: category } : {}),
      },
      // 목록에서는 옵션별 최저가/개수만 필요해서, 옵션 전체(택배사/발주마감시간 등 10여개
      // 필드)를 다 가져오지 않고 판매가만 select해 전송량을 줄인다.
      include: { category: true, options: { select: { sellingPrice: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    findSharedThumbnailGroups(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">상품 관리</h1>
        <p className="text-sm text-gray-400">{products.length}개 표시 중</p>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        카테고리별로 상품을 공개/비공개 처리할 수 있습니다. 체크박스로 상품을 선택해 카테고리를
        일괄 이동할 수도 있습니다.
      </p>

      {sharedThumbnailGroups.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            ⚠ 서로 다른 상품 {sharedThumbnailGroups.reduce((sum, g) => sum + g.products.length, 0)}개가 자동으로
            같은 사진을 사용하고 있어요 — 확인해주세요.
          </p>
          <div className="space-y-3">
            {sharedThumbnailGroups.map((group) => (
              <div key={group.key} className="flex flex-wrap items-center gap-2">
                {group.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/products/${p.id}`}
                    className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg pl-1 pr-2 py-1 hover:border-amber-400"
                  >
                    {p.thumbnailUrl && (
                      <Image
                        src={p.thumbnailUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="w-7 h-7 rounded object-cover"
                      />
                    )}
                    <span className="text-xs text-gray-700">{p.displayName ?? p.name}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="flex gap-2 mb-4" action="/admin/products">
        <input
          name="q"
          defaultValue={q}
          placeholder="상품명 검색"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-56"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 hover:border-primary"
        >
          검색
        </button>
      </form>

      <form action={bulkMoveCategoryAction}>
        <div className="flex items-center gap-2 mb-2">
          <select
            name="targetCategoryId"
            defaultValue=""
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          >
            <option value="">미지정으로 이동</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}로 이동
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5"
          >
            선택 상품 카테고리 이동
          </button>
        </div>

        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="text-left px-4 py-2 font-medium">상품명</th>
              <th className="text-left px-4 py-2 font-medium">카테고리</th>
              <th className="text-left px-4 py-2 font-medium">옵션</th>
              <th className="text-left px-4 py-2 font-medium">최저가</th>
              <th className="text-left px-4 py-2 font-medium">공개여부</th>
              <th className="text-left px-4 py-2 font-medium">베스트</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  조건에 맞는 상품이 없습니다.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const minPrice = p.options.length
                ? Math.min(...p.options.map((o) => o.sellingPrice))
                : null;
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <input type="checkbox" name="productIds" value={p.id} />
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/admin/products/${p.id}`} className="hover:text-primary">
                      {p.displayName ?? p.name}
                    </Link>
                    {p.displayName && (
                      <p className="text-xs text-gray-400">원본: {p.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{p.category?.name ?? "미지정"}</td>
                  <td className="px-4 py-2 text-gray-500">{p.options.length}개</td>
                  <td className="px-4 py-2">{minPrice !== null ? formatWon(minPrice) : "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        p.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.isActive ? "공개" : "비공개"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="submit"
                      formAction={(toggleProductFeaturedAction as (...args: unknown[]) => void).bind(
                        null,
                        p.id,
                        p.isFeatured
                      )}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        p.isFeatured ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {p.isFeatured ? "★ 베스트" : "지정 안 함"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="submit"
                      formAction={(toggleProductActiveAction as (...args: unknown[]) => void).bind(
                        null,
                        p.id,
                        p.isActive
                      )}
                      className="text-xs text-primary hover:underline"
                    >
                      {p.isActive ? "비공개로 전환" : "공개로 전환"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </form>
    </div>
  );
}

// 자동 동기화가 같은 사진 출처(구글드라이브 폴더 또는 최고집 검색결과)에서 썸네일을
// 가져온 서로 다른 상품이 있는지 찾는다. 관리자가 수동으로 사진을 올리면 해당 상품의
// thumbnailSourceKey가 비워지므로, 한 번 확인해서 고치면 다시 여기 나타나지 않는다.
async function findSharedThumbnailGroups() {
  const grouped = await prisma.product.groupBy({
    by: ["thumbnailSourceKey"],
    where: { thumbnailSourceKey: { not: null }, isActive: true },
    _count: { _all: true },
  });
  const sharedKeys = grouped.filter((g) => g._count._all > 1).map((g) => g.thumbnailSourceKey!);
  if (sharedKeys.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { thumbnailSourceKey: { in: sharedKeys }, isActive: true },
    select: { id: true, name: true, displayName: true, thumbnailUrl: true, thumbnailSourceKey: true },
    orderBy: { thumbnailSourceKey: "asc" },
  });

  return sharedKeys.map((key) => ({
    key,
    products: products.filter((p) => p.thumbnailSourceKey === key),
  }));
}
