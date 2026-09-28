"use client";

import { useActionState } from "react";
import { cancelOrderItemAction, type CancelPaymentState } from "./actions";

const initialState: CancelPaymentState = { ok: false, message: "" };

export function CancelItemButton({ orderItemId }: { orderItemId: string }) {
  const [state, formAction, pending] = useActionState(cancelOrderItemAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("이 상품만 취소하시겠어요?\n취소 후에는 되돌릴 수 없습니다.")) {
          e.preventDefault();
        }
      }}
      className="mt-1"
    >
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-red-400 hover:text-red-600 underline disabled:opacity-50"
      >
        {pending ? "취소 처리 중..." : "이 상품만 취소"}
      </button>
      {state.message && (
        <p className={`mt-1 text-xs ${state.ok ? "text-primary" : "text-red-500"}`}>{state.message}</p>
      )}
    </form>
  );
}
