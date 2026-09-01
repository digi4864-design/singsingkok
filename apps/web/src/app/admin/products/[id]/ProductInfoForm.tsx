"use client";

import { useActionState } from "react";
import { updateProductAction, type SaveState } from "./actions";

const initialState: SaveState = { ok: true, message: "" };

export function ProductInfoForm({
  productId,
  productName,
  displayName,
  origin,
  categoryId,
  isActive,
  isFeatured,
  categories,
}: {
  productId: string;
  productName: string;
  displayName: string | null;
  origin: string | null;
  categoryId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(updateProductAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4 mb-8">
      <input type="hidden" name="id" value={productId} />
      <div>
        <label className="block text-xs text-gray-500 mb-1">쇼핑몰에 노출할 상품명</label>
        <input
          name="displayName"
          defaultValue={displayName ?? productName}
          placeholder={productName}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">카테고리</label>
        <select
          name="categoryId"
          defaultValue={categoryId ?? ""}
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
          defaultValue={origin ?? ""}
          placeholder="예: 국산(경북 청도), 미국산 등"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
        <input type="checkbox" name="isActive" defaultChecked={isActive} />
        쇼핑몰에 공개
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
        <input type="checkbox" name="isFeatured" defaultChecked={isFeatured} />
        제철 베스트로 지정
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        {state.message && (
          <span className={`text-xs ${state.ok ? "text-green-600" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
