"use client";

import { useActionState } from "react";
import { importProductsAction, type ImportState } from "./actions";

const initialState: ImportState = { ok: false, message: "" };

export function ImportForm() {
  const [state, formAction, isPending] = useActionState(importProductsAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1.5">
          최고집 상품 엑셀 파일
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,.xls"
          required
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-primary file:text-white file:rounded-l-lg"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {isPending ? "처리 중..." : "업로드 및 동기화"}
      </button>

      {state.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}

      {state.summary && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700 bg-gray-50 rounded-lg p-4 max-w-sm">
          <dt>총 상품</dt>
          <dd>{state.summary.totalProducts}건</dd>
          <dt>총 옵션</dt>
          <dd>{state.summary.totalOptions}건</dd>
          <dt>신규 등록</dt>
          <dd>{state.summary.createdProducts}건</dd>
          <dt>갱신</dt>
          <dd>{state.summary.updatedProducts}건</dd>
        </dl>
      )}
    </form>
  );
}
