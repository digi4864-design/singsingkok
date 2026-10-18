"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { processProductZipAction, type UploadState } from "./actions";

const initialState: UploadState = { ok: true, message: "" };

export function ZipUploadForm({ productId }: { productId: string }) {
  const [state, setState] = useState<UploadState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setIsPending(true);
    setState(initialState);
    try {
      // 브라우저에서 Vercel Blob으로 zip을 직접 올린다(서버 액션을 거치지 않음) - 압축파일
      // 안에 큰 사진이 여러 장 있어도 Server Action 요청 본문 용량 한도에 걸리지 않는다.
      const blob = await upload(`zip-uploads/${productId}-${Date.now()}.zip`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload",
      });
      const result = await processProductZipAction(productId, blob.url);
      setState(result);
    } catch (err) {
      setState({
        ok: false,
        message: err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5 mb-6 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50">
      <label className="flex items-center gap-2 text-xs text-gray-600">
        압축파일(zip) 선택
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          className="text-xs"
          disabled={isPending}
          onChange={handleFileChange}
        />
      </label>
      <p className="text-[11px] text-gray-400">
        압축파일 안에 &quot;썸네일&quot;/&quot;상세페이지&quot; 폴더가 둘 다 있으면 각각 등록되고,
        &quot;썸네일&quot; 폴더만 있으면 그 사진이 썸네일과 상세페이지에 함께 등록됩니다.
      </p>
      {isPending && (
        <p className="text-xs text-primary">압축파일 업로드/처리 중... (사진이 많으면 시간이 걸릴 수 있습니다)</p>
      )}
      {!isPending && state.message && (
        <p className={`text-xs ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </div>
  );
}
