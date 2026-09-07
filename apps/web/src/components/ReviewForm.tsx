"use client";

import { useActionState, useState } from "react";
import { createReviewAction, deleteMyReviewAction, type ReviewState } from "@/app/products/[id]/reviewActions";

const initialState: ReviewState = { ok: false, message: "" };

// 서버가 받아줄 수 있는 전체 요청 용량에는 한도가 있는데(리뷰 폼 전체 기준 여유있게 잡아도
// 넉넉치 않음), 사진을 고른 뒤 제출 버튼을 눌렀을 때에야 서버에서 거절되면 브라우저가
// "접속 실패"로만 보여줘서 고객이 원인을 알 수 없다(실제 문의 사례). 사진을 고르는
// 즉시 브라우저에서 먼저 용량을 확인해 안내한다.
const MAX_FILE_SIZE_MB = 10;
const MAX_TOTAL_SIZE_MB = 25;

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
  const [fileError, setFileError] = useState("");

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      setFileError("");
      return;
    }

    const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    const totalMb = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

    if (tooLarge) {
      setFileError(`"${tooLarge.name}" 사진이 ${MAX_FILE_SIZE_MB}MB를 넘어요. 더 작은 사진으로 다시 선택해주세요.`);
      e.target.value = "";
    } else if (totalMb > MAX_TOTAL_SIZE_MB) {
      setFileError(`사진 전체 용량이 ${MAX_TOTAL_SIZE_MB}MB를 넘어요(${totalMb.toFixed(1)}MB). 장수를 줄이거나 더 작은 사진으로 선택해주세요.`);
      e.target.value = "";
    } else {
      setFileError("");
    }
  }

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
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            사진 첨부 (선택, 최대 3장 · 장당 {MAX_FILE_SIZE_MB}MB 이하)
          </label>
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-xs file:bg-white"
          />
          {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
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
