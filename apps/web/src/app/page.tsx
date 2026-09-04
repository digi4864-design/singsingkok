import Link from "next/link";
import { prisma } from "@farm-mall/db";
import { ProductCard } from "@/components/ProductCard";
import { PromoBanner } from "@/components/PromoBanner";
import { PromoPopup } from "@/components/PromoPopup";
import { getStorefrontName } from "@/lib/productDisplay";
import { categoryIcon } from "@/lib/categoryIcons";
import { auth } from "@/lib/auth";
import { getHomepageSharedData } from "@/lib/homepageData";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

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
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const session = await auth();
  const isDefaultView = !categorySlug && !q && page === 1;

  // 카테고리/추천상품/카테고리별 섹션/리뷰통계/배너설정은 모든 방문자에게 동일한 데이터라
  // 90초간 캐시된 값을 재사용한다(lib/homepageData.ts). 회원별로 달라지는 찜/포인트·쿠폰
  // 상태만 매 요청마다 새로 조회한다. 상품이 늘어날수록 무제한 조회가 느려지는 문제 때문에
  // 카테고리마다 개수를 제한해서 가져온다 — id IN (...) 목록으로 한 번에 묶는 방식도
  // 시도해봤는데 오히려 더 느려서 카테고리별 병렬 쿼리 방식을 유지한다.
  const [shared, products, totalCount, wishlistedIds, currentUser] = await Promise.all([
    getHomepageSharedData(),
    // 기본(전체) 화면에서는 카테고리별 섹션으로 대체 노출하므로, 검색/카테고리 필터/페이지네이션이
    // 실제로 걸려있을 때만 이 평면 목록 쿼리를 사용한다.
    isDefaultView
      ? Promise.resolve([])
      : prisma.product.findMany({
          where,
          // description 등 무거운 필드(최고집 원본에 이미지가 base64로 박혀 최대 9MB)까지
          // 딸려오지 않도록 카드 렌더링에 실제로 쓰는 필드만 select한다.
          select: {
            id: true,
            name: true,
            displayName: true,
            thumbnailUrl: true,
            options: { select: { sellingPrice: true, compliancePrice: true, isAvailable: true } },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
    isDefaultView ? Promise.resolve(0) : prisma.product.count({ where }),
    session?.user
      ? prisma.wishlist.findMany({ where: { userId: session.user.id }, select: { productId: true } })
      : Promise.resolve([]),
    session?.user
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { hasFirstPurchaseCoupon: true, firstPurchaseCouponUsed: true },
        })
      : Promise.resolve(null),
  ]);

  const { categories, featuredProducts, setting, categorySections } = shared;
  const reviewStats = new Map(shared.reviewStatsEntries);

  const firstPurchaseCouponEligible = Boolean(
    currentUser?.hasFirstPurchaseCoupon && !currentUser?.firstPurchaseCouponUsed
  );

  const wishlistedSet = new Set(wishlistedIds.map((w) => w.productId));
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function toCardData(p: { id: string; name: string; displayName: string | null; thumbnailUrl: string | null; options: { sellingPrice: number; compliancePrice: number | null; isAvailable: boolean }[] }) {
    const availableOptions = p.options.filter((o) => o.isAvailable);
    const priceSource = availableOptions.length > 0 ? availableOptions : p.options;
    const cheapest =
      priceSource.length > 0
        ? priceSource.reduce((min, o) => (o.sellingPrice < min.sellingPrice ? o : min))
        : null;
    return {
      id: p.id,
      name: getStorefrontName(p),
      minPrice: cheapest?.sellingPrice ?? null,
      compareAtPrice: cheapest?.compliancePrice ?? null,
      hasAvailableOption: availableOptions.length > 0,
      thumbnailUrl: p.thumbnailUrl,
      isWishlisted: wishlistedSet.has(p.id),
      avgRating: reviewStats.get(p.id)?.avgRating,
      reviewCount: reviewStats.get(p.id)?.count,
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
    <>
      {setting?.promoBannerEnabled &&
        setting.promoBannerText &&
        // 신규가입 유도 배너는 이미 로그인한 회원에게는 의미가 없으니 숨긴다.
        !(setting.promoBannerLink === "/signup" && session?.user) && (
          <PromoBanner text={setting.promoBannerText} link={setting.promoBannerLink} />
        )}
      {firstPurchaseCouponEligible && (
        <PromoBanner text="🎁 첫구매 감사 쿠폰 5,000원이 기다리고 있어요! (5만원 이상 구매 시 결제창에서 사용)" link={null} />
      )}
      {isDefaultView && <PromoPopup isLoggedIn={Boolean(session?.user)} />}
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
    </>
  );
}
