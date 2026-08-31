import Link from "next/link";
import { prisma } from "@farm-mall/db";
import { ProductCard } from "@/components/ProductCard";
import { categoryIcon } from "@/lib/categoryIcons";
import { sortCategoriesForStorefront } from "@/lib/categoryOrder";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const SECTION_SIZE = 8;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { category: categorySlug, q, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const where = {
    isActive: true,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const session = await auth();
  const isDefaultView = !categorySlug && !q && page === 1;

  const [categoriesRaw, products, totalCount, wishlistedIds, featuredProducts] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    // 기본(전체) 화면에서는 카테고리별 섹션으로 대체 노출하므로, 검색/카테고리 필터/페이지네이션이
    // 실제로 걸려있을 때만 이 평면 목록 쿼리를 사용한다.
    isDefaultView
      ? Promise.resolve([])
      : prisma.product.findMany({
          where,
          include: { options: true },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
    isDefaultView ? Promise.resolve(0) : prisma.product.count({ where }),
    session?.user
      ? prisma.wishlist.findMany({ where: { userId: session.user.id }, select: { productId: true } })
      : Promise.resolve([]),
    isDefaultView
      ? prisma.product.findMany({
          where: { isActive: true, isFeatured: true },
          include: { options: true },
          orderBy: { updatedAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const categories = sortCategoriesForStorefront(categoriesRaw);

  const categorySections = isDefaultView
    ? await Promise.all(
        categories.map(async (c) => ({
          category: c,
          products: await prisma.product.findMany({
            where: { isActive: true, categoryId: c.id },
            include: { options: true },
            orderBy: { updatedAt: "desc" },
            take: SECTION_SIZE,
          }),
        }))
      )
    : [];

  const wishlistedSet = new Set(wishlistedIds.map((w) => w.productId));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function toCardData(p: { id: string; name: string; thumbnailUrl: string | null; options: { sellingPrice: number; compliancePrice: number | null; isAvailable: boolean }[] }) {
    const availableOptions = p.options.filter((o) => o.isAvailable);
    const priceSource = availableOptions.length > 0 ? availableOptions : p.options;
    const cheapest =
      priceSource.length > 0
        ? priceSource.reduce((min, o) => (o.sellingPrice < min.sellingPrice ? o : min))
        : null;
    return {
      id: p.id,
      name: p.name,
      minPrice: cheapest?.sellingPrice ?? null,
      compareAtPrice: cheapest?.compliancePrice ?? null,
      hasAvailableOption: availableOptions.length > 0,
      thumbnailUrl: p.thumbnailUrl,
      isWishlisted: wishlistedSet.has(p.id),
    };
  }

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <form action="/" className="mb-6 flex gap-2 max-w-md">
        {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="상품명 검색"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:border-primary active:scale-95 transition-transform"
        >
          검색
        </button>
      </form>

      <nav className="flex flex-wrap gap-2 mb-6">
        <Link
          href={q ? `/?q=${encodeURIComponent(q)}` : "/"}
          className={`px-3 py-1.5 rounded-full text-sm border transition-transform active:scale-95 ${
            !categorySlug
              ? "bg-primary text-white border-primary"
              : "border-gray-300 text-gray-600 hover:border-primary"
          }`}
        >
          🛍️ 전체
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/?category=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-transform active:scale-95 ${
              categorySlug === c.slug
                ? "bg-primary text-white border-primary"
                : "border-gray-300 text-gray-600 hover:border-primary"
            }`}
          >
            {categoryIcon(c.name)} {c.name}
          </Link>
        ))}
      </nav>

      {isDefaultView && featuredProducts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-1.5">
            🌞 지금 제철, 이번 주 베스트
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={toCardData(p)} />
            ))}
          </div>
        </section>
      )}

      {isDefaultView ? (
        categorySections.every((s) => s.products.length === 0) && featuredProducts.length === 0 ? (
          <p className="text-center text-gray-400 py-24">
            아직 등록된 상품이 없습니다.{" "}
            <Link href="/admin/products/import" className="text-primary hover:underline">
              상품 업로드하러 가기
            </Link>
          </p>
        ) : (
          categorySections.map(
            ({ category, products: sectionProducts }) =>
              sectionProducts.length > 0 && (
                <section key={category.id} className="mb-10">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                      {categoryIcon(category.name)} {category.name}
                    </h2>
                    <Link
                      href={`/?category=${category.slug}`}
                      className="text-sm text-gray-400 hover:text-primary"
                    >
                      더보기 →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {sectionProducts.map((p) => (
                      <ProductCard key={p.id} product={toCardData(p)} />
                    ))}
                  </div>
                </section>
              )
          )
        )
      ) : products.length === 0 ? (
        <p className="text-center text-gray-400 py-24">
          {q ? `"${q}"에 대한 검색 결과가 없습니다.` : "해당 카테고리에 등록된 상품이 없습니다."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={toCardData(p)} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-10">
              <Link
                href={pageHref(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-transform active:scale-95 ${
                  page <= 1
                    ? "border-gray-200 text-gray-300 pointer-events-none"
                    : "border-gray-300 text-gray-600 hover:border-primary"
                }`}
              >
                이전
              </Link>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <Link
                href={pageHref(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-transform active:scale-95 ${
                  page >= totalPages
                    ? "border-gray-200 text-gray-300 pointer-events-none"
                    : "border-gray-300 text-gray-600 hover:border-primary"
                }`}
              >
                다음
              </Link>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
