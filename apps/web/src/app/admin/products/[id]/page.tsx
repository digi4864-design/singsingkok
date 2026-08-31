import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import { updateProductAction, updateOptionPriceAction, resetOptionPriceAction, removeDetailImageAction } from "./actions";
import { ThumbnailUploadForm } from "./ThumbnailUploadForm";
import { DetailImagesUploadForm } from "./DetailImagesUploadForm";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage(props: PageProps<"/admin/products/[id]">) {
  const { id } = await props.params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { category: true, options: { orderBy: { optionName: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{product.displayName ?? product.name}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {product.displayName && (
          <>
            원본 상품명: {product.name}
            <br />
          </>
        )}
        마지막 동기화: {product.lastSyncedAt.toLocaleString("ko-KR")}
      </p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">대표 썸네일</h2>
        <div className="flex items-center gap-4 mb-3">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
            {product.thumbnailUrl ? (
              <Image src={product.thumbnailUrl} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
                이미지 없음
              </div>
            )}
          </div>
          <ThumbnailUploadForm productId={product.id} />
        </div>

        <h2 className="text-sm font-semibold text-gray-700 mb-2">상세페이지 이미지</h2>
        {product.images.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            {product.images.map((url) => (
              <div key={url} className="relative">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
                <form action={removeDetailImageAction} className="absolute top-1 right-1">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="url" value={url} />
                  <button
                    type="submit"
                    className="w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-5"
                  >
                    ×
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <DetailImagesUploadForm productId={product.id} />
      </section>

      <form action={updateProductAction} className="flex flex-wrap items-end gap-4 mb-8">
        <input type="hidden" name="id" value={product.id} />
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            쇼핑몰에 노출할 상품명
          </label>
          <input
            name="displayName"
            defaultValue={product.displayName ?? product.name}
            placeholder={product.name}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">카테고리</label>
          <select
            name="categoryId"
            defaultValue={product.categoryId ?? ""}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48"
          >
            <option value="">미지정</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            원산지 (농수산물 원산지표시법 준수 필요)
          </label>
          <input
            name="origin"
            defaultValue={product.origin ?? ""}
            placeholder="예: 국산(경북 청도), 미국산 등"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
          <input type="checkbox" name="isActive" defaultChecked={product.isActive} />
          쇼핑몰에 공개
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
          <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} />
          제철 베스트로 지정
        </label>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover"
        >
          저장
        </button>
      </form>
      {!product.origin && (
        <p className="text-xs text-red-500 -mt-6 mb-8">
          ⚠ 원산지가 등록되지 않았습니다. 농수산물의 원산지 표시에 관한 법률상 원산지 표시는
          의무사항이므로, 공개 전 반드시 입력해주세요.
        </p>
      )}

      <h2 className="text-sm font-semibold text-gray-700 mb-2">옵션별 가격</h2>
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left px-4 py-2 font-medium">옵션명</th>
            <th className="text-left px-4 py-2 font-medium">공급가</th>
            <th className="text-left px-4 py-2 font-medium">판매가</th>
            <th className="text-left px-4 py-2 font-medium">상태</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {product.options.map((o) => {
            const belowCompliance =
              o.compliancePrice != null && o.sellingPrice < o.compliancePrice;
            return (
              <tr key={o.id}>
                <td className="px-4 py-2">{o.optionName}</td>
                <td className="px-4 py-2 text-gray-500">{formatWon(o.price)}</td>
                <td className="px-4 py-2">
                  <form action={updateOptionPriceAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="optionId" value={o.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <input
                      name="sellingPrice"
                      type="number"
                      defaultValue={o.sellingPrice}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                    <button type="submit" className="text-xs text-primary hover:underline">
                      저장
                    </button>
                  </form>
                  {o.isPriceManual && (
                    <form action={resetOptionPriceAction} className="mt-1">
                      <input type="hidden" name="optionId" value={o.id} />
                      <input type="hidden" name="productId" value={product.id} />
                      <button type="submit" className="text-xs text-gray-400 hover:underline">
                        자동계산으로 되돌리기
                      </button>
                    </form>
                  )}
                  {belowCompliance && (
                    <p className="text-xs text-red-500 mt-1">
                      ⚠ 준수판매가({formatWon(o.compliancePrice!)}) 미만
                    </p>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      o.isAvailable ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {o.isAvailable ? "판매중" : "품절"}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-gray-400">
                  {o.isPriceManual ? "수동설정" : "자동계산"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
