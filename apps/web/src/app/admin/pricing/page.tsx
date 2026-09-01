import { prisma } from "@farm-mall/db";
import { addBracketAction, updateBracketAction, deleteBracketAction } from "./actions";
import { RecalcButton } from "./RecalcButton";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const brackets = await prisma.marginBracket.findMany({ orderBy: { minPrice: "asc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">가격/마진 설정</h1>
      <p className="text-sm text-gray-500 mb-6">
        공급가 구간별로 마진율(%)을 설정하면, 엑셀 업로드 시 판매가가 자동으로 계산됩니다.
        관리자가 개별 상품에서 판매가를 직접 수정한 경우, 재업로드·재계산 시에도 그 값이
        유지됩니다.
      </p>

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mb-4">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">최소 공급가</th>
            <th className="text-left px-4 py-2 font-medium">최대 공급가</th>
            <th className="text-left px-4 py-2 font-medium">마진율</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {brackets.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                등록된 마진 구간이 없습니다. 아래에서 추가해주세요.
              </td>
            </tr>
          )}
          {brackets.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-2">
                <form id={`bracket-${b.id}`} action={updateBracketAction}>
                  <input type="hidden" name="id" value={b.id} />
                </form>
                <input
                  form={`bracket-${b.id}`}
                  name="minPrice"
                  type="number"
                  required
                  defaultValue={b.minPrice}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  form={`bracket-${b.id}`}
                  name="maxPrice"
                  type="number"
                  defaultValue={b.maxPrice ?? undefined}
                  placeholder="이상 전체"
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
              </td>
              <td className="px-4 py-2">
                <input
                  form={`bracket-${b.id}`}
                  name="marginPercent"
                  type="number"
                  step="0.1"
                  required
                  defaultValue={b.marginPercent}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
                %
              </td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                <button
                  form={`bracket-${b.id}`}
                  type="submit"
                  className="text-xs text-primary hover:underline mr-3"
                >
                  저장
                </button>
                <form action={deleteBracketAction} className="inline">
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="text-xs text-gray-400 hover:text-red-500">
                    삭제
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={addBracketAction} className="flex items-end gap-2 mb-10">
        <div>
          <label className="block text-xs text-gray-500 mb-1">최소 공급가</label>
          <input
            name="minPrice"
            type="number"
            required
            placeholder="5000"
            className="w-28 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">최대 공급가 (비우면 이상)</label>
          <input
            name="maxPrice"
            type="number"
            placeholder="10000"
            className="w-28 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">마진율(%)</label>
          <input
            name="marginPercent"
            type="number"
            step="0.1"
            required
            placeholder="20"
            className="w-24 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5"
        >
          구간 추가
        </button>
      </form>

      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">일괄 재계산</h2>
        <p className="text-xs text-gray-500 mb-3">
          구간을 수정한 뒤, 이미 등록된 상품들의 판매가에 새 마진율을 일괄 반영합니다. (개별
          수정한 상품은 제외)
        </p>
        <RecalcButton />
      </div>
    </div>
  );
}
