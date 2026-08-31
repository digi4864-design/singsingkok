"use client";

import { useActionState } from "react";
import { uploadDetailImagesAction, type UploadState } from "./actions";

const initialState: UploadState = { ok: true, message: "" };

export function DetailImagesUploadForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(uploadDetailImagesAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center gap-2">
        <input type="file" name="files" accept="image/*" multiple required className="text-xs" />
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-xs rounded-lg border border-primary text-primary hover:bg-primary/5 shrink-0 disabled:opacity-50"
        >
          {isPending ? "업로드 중..." : "상세이미지 추가"}
        </button>
      </div>
      {state.message && (
        <p className={`text-xs mt-1 ${state.ok ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
