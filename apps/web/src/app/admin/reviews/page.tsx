import Link from "next/link";
import { prisma } from "@farm-mall/db";
import { toggleReviewHiddenAction, deleteReviewAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;

  const reviews = await prisma.review.findMany({
    where: filter === "hidden" ? { isHidden: true } : undefined,
    include: { product: { select: { id: true, name: true, displayName: true } }, user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-gray-900">리뷰 관리</h1>
        <p className="text-sm text-gray-400">{reviews.length}개 표시 중</p>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        부적절한 리뷰는 숨김 처리하거나 삭제할 수 있습니다. 숨김 처리된 리뷰는 상품 상세페이지에
        노출되지 않습니다.
      </p>

      <div className="flex gap-2 mb-4">
        <Link
          href="/admin/reviews"
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            !filter ? "bg-primary text-white border-primary" : "border-gray-300 text-gray-600"
          }`}
        >
          전체
        </Link>
        <Link
          href="/admin/reviews?filter=hidden"
          className={`px-3 py-1.5 text-sm rounded-lg border ${
            filter === "hidden" ? "bg-primary text-white border-primary" : "border-gray-300 text-gray-600"
          }`}
        >
          숨김 처리됨
        </Link>
      </div>

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">상품</th>
            <th className="text-left px-4 py-2 font-medium">작성자</th>
            <th className="text-left px-4 py-2 font-medium">평점</th>
            <th className="text-left px-4 py-2 font-medium">내용</th>
            <th className="text-left px-4 py-2 font-medium">작성일</th>
            <th className="text-left px-4 py-2 font-medium">상태</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {reviews.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                리뷰가 없습니다.
              </td>
            </tr>
          )}
          {reviews.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2">
                <Link href={`/products/${r.product.id}`} className="hover:text-primary">
                  {r.product.displayName ?? r.product.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-gray-500">{r.user.name ?? r.user.email}</td>
              <td className="px-4 py-2">{"★".repeat(r.rating)}</td>
              <td className="px-4 py-2 max-w-xs truncate" title={r.content}>
                {r.content}
              </td>
              <td className="px-4 py-2 text-gray-400">
                {r.createdAt.toLocaleDateString("ko-KR")}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    r.isHidden ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-700"
                  }`}
                >
                  {r.isHidden ? "숨김" : "노출중"}
                </span>
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <form className="inline">
                  <button
                    type="submit"
                    formAction={(toggleReviewHiddenAction as (...args: unknown[]) => void).bind(
                      null,
                      r.id,
                      r.isHidden
                    )}
                    className="text-xs text-primary hover:underline mr-3"
                  >
                    {r.isHidden ? "노출로 전환" : "숨기기"}
                  </button>
                  <button
                    type="submit"
                    formAction={deleteReviewAction.bind(null, r.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
