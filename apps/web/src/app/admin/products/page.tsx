import Image from "next/image";
import Link from "next/link";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import {
  toggleProductActiveAction,
  toggleProductFeaturedAction,
  dismissSharedThumbnailWarningAction,
} from "./actions";
import { bulkMoveCategoryAction } from "../categories/actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string; newDays?: string; missing?: string }>;
}) {
  const { q, category, page: pageRaw, newDays, missing } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const newDaysNum = newDays ? Number(newDays) : null;
  const isNewOnly = Boolean(newDaysNum && newDaysNum > 0);
  const sinceDate = isNewOnly ? new Date(Date.now() - newDaysNum! * 24 * 60 * 60 * 1000) : null;
  const isMissingOrigin = missing === "origin";
  const isMissingDescription = missing === "description";

  // q(이름 검색)와 missing(원산지/설명 누락) 필터가 둘 다 OR 조건을 쓰기 때문에, 같은
  // 객체에 OR 키를 두 번 스프레드하면 뒤엣것이 앞엣것을 덮어써버린다. AND 배열로 묶어
  // 각 조건을 독립적으로 유지한다.
  const andConditions = [
    ...(q
      ? [
          {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { displayName: { contains: q, mode: "insensitive" as const } },
            ],
          },
        ]
      : []),
    ...(category ? [{ categoryId: category }] : []),
    ...(sinceDate ? [{ createdAt: { gte: sinceDate } }] : []),
    ...(isMissingOrigin ? [{ OR: [{ origin: null }, { origin: "" }] }] : []),
    ...(isMissingDescription ? [{ OR: [{ description: null }, { description: "" }] }] : []),
  ];
  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [categories, products, totalCount, sharedThumbnailGroups] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where,
      // 목록에서는 상품명/카테고리/옵션 최저가만 필요하다. description/supplierNotice는
      // 최고집 쪽에서 이미지가 base64로 통째로 박혀 들어오는 경우가 있어 상품 하나에 최대
      // 9MB까지도 나가는데, include를 쓰면 이런 무거운 필드까지 전부 같이 딸려와 목록
      // 조회 자체가 느려진다. select로 실제 쓰는 필드만 명시해서 뺀다.
      select: {
        id: true,
        name: true,
        displayName: true,
        thumbnailUrl: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
        origin: true,
        category: { select: { name: true } },
        options: { select: { sellingPrice: true } },
      },
      orderBy: isNewOnly ? { createdAt: "desc" } : { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    findSharedThumbnailGroups(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (newDays) params.set("newDays", newDays);
    if (missing) params.set("missing", missing);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">상품 관리</h1>
        <p className="text-sm text-gray-400">
          전체 {totalCount}개 중 {products.length}개 표시 중 ({page}/{totalPages}페이지)
        </p>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {isMissingOrigin
          ? "⚠ 원산지가 표시되지 않은 상품만 표시 중입니다. 농수산물의 원산지 표시에 관한 법률상 의무사항이니 확인해 입력해주세요."
          : isMissingDescription
            ? "상세설명이 없는 상품만 표시 중입니다."
            : isNewOnly
              ? `최근 ${newDaysNum}일 이내 등록된 상품만 표시 중입니다. 체크박스로 상품을 선택해 카테고리를 일괄 이동할 수도 있습니다.`
              : "카테고리별로 상품을 공개/비공개 처리할 수 있습니다. 체크박스로 상품을 선택해 카테고리를 일괄 이동할 수도 있습니다."}
      </p>

      {sharedThumbnailGroups.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            ⚠ 서로 다른 상품 {sharedThumbnailGroups.reduce((sum, g) => sum + g.products.length, 0)}개가 자동으로
            같은 사진을 사용하고 있어요 — 확인해주세요.
          </p>
          <p className="text-xs text-amber-700 mb-2">
            이미 확인했거나 직접 사진을 손봐둔 상품은 체크 후 아래 버튼으로 목록에서 빼주세요.
          </p>
          <form action={dismissSharedThumbnailWarningAction}>
            <div className="space-y-3">
              {sharedThumbnailGroups.map((group) => (
                <div key={group.key} className="flex flex-wrap items-center gap-2">
                  {group.products.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg pl-1.5 pr-2 py-1 hover:border-amber-400 cursor-pointer"
                    >
                      <input type="checkbox" name="dismissProductIds" value={p.id} className="shrink-0" />
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
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="text-[11px] text-amber-700 underline underline-offset-2 ml-0.5"
                      >
                        상품보기
                      </Link>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <button
              type="submit"
              className="mt-3 px-3 py-1.5 text-xs rounded-lg border border-amber-400 text-amber-800 bg-white hover:bg-amber-100"
            >
              선택한 상품 목록에서 제외
            </button>
          </form>
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
        <select
          name="newDays"
          defaultValue={newDays ?? ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 등록일</option>
          <option value="1">신규(1일 이내)</option>
          <option value="3">신규(3일 이내)</option>
          <option value="7">신규(7일 이내)</option>
        </select>
        <select
          name="missing"
          defaultValue={missing ?? ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">전체 표시</option>
          <option value="origin">⚠ 원산지 없음</option>
          <option value="description">상세설명 없음</option>
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
              {isNewOnly && <th className="text-left px-4 py-2 font-medium">등록일</th>}
              {isMissingOrigin && <th className="text-left px-4 py-2 font-medium">원산지</th>}
              <th className="text-left px-4 py-2 font-medium">공개여부</th>
              <th className="text-left px-4 py-2 font-medium">베스트</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={7 + (isNewOnly ? 1 : 0) + (isMissingOrigin ? 1 : 0)}
                  className="px-4 py-10 text-center text-gray-400"
                >
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
                  {isNewOnly && (
                    <td className="px-4 py-2 text-gray-500">{p.createdAt.toLocaleDateString("ko-KR")}</td>
                  )}
                  {isMissingOrigin && (
                    <td className="px-4 py-2 text-red-500 text-xs">{p.origin || "⚠ 미표시"}</td>
                  )}
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

      {totalPages > 1 && (
        <nav className="flex flex-wrap gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                p === page
                  ? "bg-primary text-white border-primary"
                  : "border-gray-300 text-gray-600 hover:border-primary"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
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
