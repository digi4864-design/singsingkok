import { prisma } from "@farm-mall/db";
import { createCategoryAction, renameCategoryAction, deleteCategoryAction } from "./actions";
import { ReclassifyButton } from "./ReclassifyButton";
import { BulkOriginForm } from "./BulkOriginForm";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">카테고리 관리</h1>
      <p className="text-sm text-gray-500 mb-6">
        상품 업로드 시 구글 드라이브 폴더명으로 자동 생성되지만, 필요한 카테고리를 직접
        추가·수정·삭제할 수 있습니다. 상품별 카테고리 배정은 상품 관리 화면에서 변경합니다.
      </p>

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mb-6">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">이름</th>
            <th className="text-left px-4 py-2 font-medium">상품 수</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                등록된 카테고리가 없습니다.
              </td>
            </tr>
          )}
          {categories.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2">
                <form action={renameCategoryAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="name"
                    defaultValue={c.name}
                    className="border border-gray-200 rounded px-2 py-1 text-sm w-40"
                  />
                  <button type="submit" className="text-xs text-primary hover:underline">
                    저장
                  </button>
                </form>
              </td>
              <td className="px-4 py-2 text-gray-500">{c._count.products}개</td>
              <td className="px-4 py-2 text-right">
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-500">
                    삭제
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={createCategoryAction} className="flex items-end gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">새 카테고리 이름</label>
          <input
            name="name"
            required
            placeholder="예: 쌀/잡곡"
            className="w-52 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5"
        >
          추가
        </button>
      </form>

      <div className="border-t border-gray-200 mt-8 pt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">카테고리 자동 정리</h2>
        <p className="text-xs text-gray-500 mb-3">
          상품명이 &quot;[은하수산]&quot;으로 시작하는 상품을 &quot;은하수산&quot; 카테고리로,
          카테고리가 없는 상품을 &quot;미지정&quot; 카테고리로 자동 이동합니다. (엑셀 업로드 시에도
          자동으로 실행됩니다)
        </p>
        <ReclassifyButton />
      </div>

      <div className="border-t border-gray-200 mt-8 pt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">카테고리별 원산지 일괄 지정</h2>
        <p className="text-xs text-gray-500 mb-3">
          카테고리를 선택해 원산지를 한 번에 적용합니다. 상품마다 원산지가 다른 경우(예: 수입과일
          카테고리에 국가가 여러 곳인 경우)에는 개별 상품 페이지에서 따로 수정해주세요. 원산지
          표시는 농수산물의 원산지 표시에 관한 법률상 의무사항이니 실제와 다르게 입력하지
          않도록 주의해주세요.
        </p>
        <BulkOriginForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>
    </div>
  );
}
