import Link from "next/link";
import { prisma } from "@farm-mall/db";

export const dynamic = "force-dynamic";

function StatCard({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const content = (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-primary transition-colors">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function AdminDashboardPage() {
  const [
    totalProducts,
    activeProducts,
    totalOptions,
    soldOutOptions,
    categoryCount,
    lastImport,
    pendingPaymentOrders,
    paidOrders,
    shippingOrders,
    missingImageCount,
    missingOriginCount,
    reviewCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productOption.count(),
    prisma.productOption.count({ where: { isAvailable: false } }),
    prisma.category.count(),
    prisma.importRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.count({ where: { status: "SHIPPING" } }),
    prisma.product.count({ where: { thumbnailUrl: null } }),
    prisma.product.count({ where: { isActive: true, origin: null } }),
    prisma.review.count(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">대시보드</h1>

      {(missingImageCount > 0 || missingOriginCount > 0) && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-1">
          <p className="font-semibold">⚠ 확인이 필요한 항목</p>
          {missingImageCount > 0 && (
            <p>
              사진이 없는 상품 {missingImageCount}건 (자동으로 비공개 처리됨) —{" "}
              <Link href="/admin/products/import" className="underline">
                구글 드라이브 재동기화
              </Link>{" "}
              또는{" "}
              <Link href="/admin/products" className="underline">
                직접 업로드
              </Link>
              가 필요합니다.
            </p>
          )}
          {missingOriginCount > 0 && (
            <p>
              공개중인데 원산지 미표기 상품 {missingOriginCount}건 — 농수산물의 원산지 표시에 관한
              법률상 의무사항이니{" "}
              <Link href="/admin/products" className="underline">
                상품 관리
              </Link>
              에서 확인해주세요.
            </p>
          )}
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-700 mb-2">주문 현황</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="입금대기" value={pendingPaymentOrders} href="/admin/orders?status=PENDING_PAYMENT" />
        <StatCard label="결제완료(배송준비 필요)" value={paidOrders} href="/admin/orders?status=PAID" />
        <StatCard label="배송중" value={shippingOrders} href="/admin/orders?status=SHIPPING" />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-2">상품 현황</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="전체 상품" value={totalProducts} href="/admin/products" />
        <StatCard label="공개중 상품" value={activeProducts} href="/admin/products" />
        <StatCard label="전체 옵션(SKU)" value={totalOptions} />
        <StatCard label="품절 옵션" value={soldOutOptions} />
        <StatCard label="카테고리" value={categoryCount} href="/admin/categories" />
        <StatCard label="리뷰" value={reviewCount} href="/admin/reviews" />
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-2">최근 엑셀 업로드</h2>
      {lastImport ? (
        <div className="border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-1 max-w-md">
          <p>실행 시각: {lastImport.startedAt.toLocaleString("ko-KR")}</p>
          <p>
            상품 {lastImport.totalProducts}건 / 옵션 {lastImport.totalOptions}건 (신규{" "}
            {lastImport.createdProducts} · 갱신 {lastImport.updatedProducts})
          </p>
          <p>
            이미지 동기화 {lastImport.imageSynced}건 / 건너뜀 {lastImport.imageSkipped}건 / 실패{" "}
            {lastImport.imageFailed}건
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">아직 업로드 기록이 없습니다.</p>
      )}

      <div className="mt-6">
        <Link href="/admin/products/import" className="text-sm text-primary hover:underline">
          새 엑셀 업로드하러 가기 →
        </Link>
      </div>
    </div>
  );
}
