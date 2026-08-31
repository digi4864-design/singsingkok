"use client";

import { useActionState } from "react";
import { importTrackingAction, type TrackingImportState } from "./actions";

const initialState: TrackingImportState = { ok: false, message: "" };

export function TrackingImportForm() {
  const [state, formAction, isPending] = useActionState(importTrackingAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1.5">
          송장 엑셀 파일
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
        {isPending ? "처리 중..." : "업로드 및 일괄 등록"}
      </button>

      {state.message && (
        <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>
      )}

      {state.summary && state.summary.unmatched.length > 0 && (
        <div className="text-sm border border-amber-200 bg-amber-50 rounded-lg p-4 max-w-xl">
          <p className="font-medium text-amber-800 mb-2">
            매칭 실패 {state.summary.unmatched.length}건 (개별 주문 상세페이지에서 직접 등록해주세요)
          </p>
          <ul className="space-y-1 text-amber-700 text-xs">
            {state.summary.unmatched.map((u) => (
              <li key={u.row}>
                {u.row}행 (운송장 {u.trackingNumber}) — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
