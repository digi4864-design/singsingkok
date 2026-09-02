"use client";

import { useActionState, useEffect, useRef } from "react";
import { uploadThumbnailAction, type UploadState } from "./actions";

const initialState: UploadState = { ok: true, message: "" };

export function ThumbnailUploadForm({
  productId,
  remainingSlots,
}: {
  productId: string;
  remainingSlots: number;
}) {
  const [state, formAction, isPending] = useActionState(uploadThumbnailAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.message) formRef.current?.reset();
  }, [state]);

  if (remainingSlots <= 0) {
    return <p className="text-xs text-gray-400">썸네일은 최대 5장까지 등록할 수 있습니다.</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-1.5">
      <input type="hidden" name="productId" value={productId} />
      <label className="flex items-center gap-2 text-xs text-gray-500">
        파일 선택
        <input
          type="file"
          name="files"
          accept="image/*"
          multiple
          className="text-xs"
          onChange={(e) => {
            if (e.currentTarget.files?.length) formRef.current?.requestSubmit();
          }}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-500">
        폴더 선택
        <input
          type="file"
          name="files"
          multiple
          // PC 폴더를 통째로 선택하면 안의 이미지 파일이 한 번에 업로드된다(표준 file input
          // 타입에는 없지만 크로미움/사파리 계열 브라우저가 공통으로 지원하는 속성).
          {...{ webkitdirectory: "", directory: "" }}
          className="text-xs"
          onChange={(e) => {
            if (e.currentTarget.files?.length) formRef.current?.requestSubmit();
          }}
        />
      </label>
      <p className="text-[11px] text-gray-400">
        {`폴더를 선택하면 그 안의 이미지가 최대 ${remainingSlots}장까지 자동으로 업로드됩니다.`}
      </p>
      {isPending && <p className="text-xs text-primary">업로드 중...</p>}
      {!isPending && state.message && (
        <p className={`text-xs ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </form>
  );
}
