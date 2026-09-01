"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { confirmDeliveryAction, requestReturnAction, type ReturnRequestState } from "./actions";

const initialReturnState: ReturnRequestState = { ok: false, message: "" };

export function OrderActions({
  orderId,
  status,
  returnReason,
  reviewLinks,
}: {
  orderId: string;
  status: string;
  returnReason: string | null;
  reviewLinks: { productId: string; productName: string }[];
}) {
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnState, returnAction, returnPending] = useActionState(requestReturnAction, initialReturnState);

  if (status === "SHIPPING" || status === "DELIVERED") {
    return (
      <section className="mb-8 space-y-3">
        {status === "SHIPPING" && (
          <div>
            <form
              action={confirmDeliveryAction}
              onSubmit={(e) => {
                if (
                  !confirm(
                    "상품을 정상적으로 수령하셨나요?\n확인 시 구매확정 처리되며 배송완료 상태로 변경됩니다."
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="orderId" value={orderId} />
              <button
                type="submit"
                className="w-full py-2.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover font-medium"
              >
                배송완료 확인 (구매확정)
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-1.5">
              상품에 문제가 있다면 구매확정 대신 아래에서 반품/교환을 요청해주세요.
            </p>
          </div>
        )}

        {status === "DELIVERED" && reviewLinks.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">리뷰 작성</h2>
            <div className="flex flex-wrap gap-2">
              {reviewLinks.map((item) => (
                <Link
                  key={item.productId}
                  href={`/products/${item.productId}#review`}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
                >
                  {item.productName} 리뷰 작성하기
                </Link>
              ))}
            </div>
          </div>
        )}

        {!showReturnForm ? (
          <button
            type="button"
            onClick={() => setShowReturnForm(true)}
            className="text-xs text-gray-400 hover:text-red-500 underline"
          >
            반품/교환 요청하기
          </button>
        ) : (
          <form action={returnAction} className="space-y-2 border border-gray-200 rounded-lg p-3">
            <input type="hidden" name="orderId" value={orderId} />
            <label className="block text-xs text-gray-500">반품/교환 사유</label>
            <textarea
              name="reason"
              rows={2}
              placeholder="반품·교환·환불 중 원하시는 처리와 사유를 함께 적어주세요."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {returnState.message && (
              <p className={`text-xs ${returnState.ok ? "text-primary" : "text-red-500"}`}>
                {returnState.message}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={returnPending}
                className="px-4 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                반품/교환 요청 제출
              </button>
              <button
                type="button"
                onClick={() => setShowReturnForm(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </section>
    );
  }

  if (status === "RETURN_REQUESTED") {
    return (
      <section className="mb-8 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-3">
        <p className="font-medium mb-1">반품/교환 요청이 접수되었습니다.</p>
        {returnReason && <p className="text-xs">사유: {returnReason}</p>}
      </section>
    );
  }

  return null;
}
