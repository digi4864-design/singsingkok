import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@farm-mall/db";
import { formatWon } from "@/lib/format";
import {
  updateOptionPriceAction,
  resetOptionPriceAction,
  removeDetailImageAction,
  removeThumbnailImageAction,
} from "./actions";
import { ThumbnailUploadForm } from "./ThumbnailUploadForm";
import { DetailImagesUploadForm } from "./DetailImagesUploadForm";
import { ProductInfoForm } from "./ProductInfoForm";

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
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          상품 썸네일 (최대 5장, 첫 번째가 대표 이미지로 쓰입니다)
        </h2>
        {product.thumbnailImages.length > 0 ? (
          <div className="grid grid-cols-5 gap-2 mb-3">
            {product.thumbnailImages.map((url, i) => (
              <div key={url} className="relative">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-primary text-white">
                    대표
                  </span>
                )}
                <form action={removeThumbnailImageAction} className="absolute top-1 right-1">
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
        ) : (
          <p className="text-xs text-gray-400 mb-3">등록된 썸네일이 없습니다.</p>
        )}
        <ThumbnailUploadForm
          productId={product.id}
          remainingSlots={5 - product.thumbnailImages.length}
        />

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

      <ProductInfoForm
        productId={product.id}
        productName={product.name}
        displayName={product.displayName}
        origin={product.origin}
        categoryId={product.categoryId}
        isActive={product.isActive}
        isFeatured={product.isFeatured}
        categories={categories}
      />
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
