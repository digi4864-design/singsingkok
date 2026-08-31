"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { lookupOrderAction, type LookupState } from "./actions";

const initialState: LookupState = { ok: true, message: "" };

export function LookupForm() {
  const [state, formAction, isPending] = useActionState(lookupOrderAction, initialState);
  const router = useRouter();
  const [orderNo, setOrderNo] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  useEffect(() => {
    if (state.ok && state.orderId) {
      router.push(`/orders/${state.orderId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">주문번호</label>
        <input
          name="orderNo"
          required
          placeholder="ORD..."
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">주문 시 입력한 연락처</label>
        <input
          name="recipientPhone"
          required
          placeholder="010-0000-0000"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {!state.ok && state.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {isPending ? "조회 중..." : "주문 조회"}
      </button>
    </form>
  );
}
