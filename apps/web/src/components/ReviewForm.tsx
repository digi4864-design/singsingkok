"use client";

import { useActionState, useState } from "react";
import { createReviewAction, deleteMyReviewAction, type ReviewState } from "@/app/products/[id]/reviewActions";

const initialState: ReviewState = { ok: false, message: "" };

export function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing: { rating: number; content: string } | null;
}) {
  const boundAction = createReviewAction.bind(null, productId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [rating, setRating] = useState(existing?.rating ?? 5);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">평점</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl leading-none ${n <= rating ? "text-amber-400" : "text-gray-200"}`}
                aria-label={`${n}점`}
              >
                ★
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">리뷰 내용</label>
          <textarea
            name="content"
            defaultValue={existing?.content}
            rows={3}
            placeholder="상품에 대한 솔직한 후기를 남겨주세요."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {state.message && (
          <p className={`text-xs ${state.ok ? "text-primary" : "text-red-500"}`}>{state.message}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {existing ? "리뷰 수정" : "리뷰 등록"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={() => deleteMyReviewAction(productId)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              내 리뷰 삭제
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
