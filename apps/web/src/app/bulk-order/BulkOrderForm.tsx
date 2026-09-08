"use client";

import { useActionState } from "react";
import { submitBulkOrderInquiryAction, type BulkOrderState } from "./actions";

const initialState: BulkOrderState = { ok: false, message: "" };

export function BulkOrderForm() {
  const [state, formAction, pending] = useActionState(submitBulkOrderInquiryAction, initialState);

  if (state.ok) {
    return (
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-6 text-center">
        <p className="text-2xl mb-2">🙏</p>
        <p className="text-sm font-medium text-gray-800">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">회사/단체명 *</label>
          <input
            name="companyName"
            required
            placeholder="예: (주)싱싱상사"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">담당자명 *</label>
          <input
            name="contactName"
            required
            placeholder="예: 홍길동"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">연락처 *</label>
        <input
          name="phone"
          required
          placeholder="010-0000-0000"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">관심 상품</label>
          <input
            name="productInterest"
            placeholder="예: 한우 선물세트"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">희망 수량</label>
          <input
            name="quantity"
            placeholder="예: 30개 내외"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">문의 내용</label>
        <textarea
          name="message"
          rows={3}
          placeholder="배송 희망일, 예산, 포장 요청사항 등 자유롭게 남겨주세요."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {state.message && <p className="text-xs text-red-500">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "접수 중..." : "문의 남기기"}
      </button>
    </form>
  );
}
