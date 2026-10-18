"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadProductZipAction, type UploadState } from "./actions";

const initialState: UploadState = { ok: true, message: "" };

export function ZipUploadForm({ productId }: { productId: string }) {
  const [state, formAction, isPending] = useActionState(uploadProductZipAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-1.5 mb-6 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50"
    >
      <input type="hidden" name="productId" value={productId} />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        압축파일(zip) 선택
        <input
          type="file"
          name="zipFile"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="text-xs"
          onChange={(e) => {
            if (e.currentTarget.files?.length) formRef.current?.requestSubmit();
          }}
        />
      </label>
      <p className="text-[11px] text-gray-400">
        압축파일 안에 &quot;썸네일&quot;/&quot;상세페이지&quot; 폴더가 둘 다 있으면 각각 등록되고,
        &quot;썸네일&quot; 폴더만 있으면 그 사진이 썸네일과 상세페이지에 함께 등록됩니다.
      </p>
      {isPending && (
        <p className="text-xs text-primary">압축파일 업로드 중... (사진이 많으면 시간이 걸릴 수 있습니다)</p>
      )}
      {!isPending && state.message && (
        <p className={`text-xs ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}
