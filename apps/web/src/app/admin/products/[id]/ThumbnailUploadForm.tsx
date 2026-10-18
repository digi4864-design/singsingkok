"use client";

import { useRef, useState } from "react";
import { uploadThumbnailAction, type UploadState } from "./actions";
import { stageFilesToBlob } from "./stageUpload";

const initialState: UploadState = { ok: true, message: "" };

export function ThumbnailUploadForm({
  productId,
  remainingSlots,
}: {
  productId: string;
  remainingSlots: number;
}) {
  const [state, setState] = useState<UploadState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (remainingSlots <= 0) {
    return <p className="text-xs text-gray-400">썸네일은 최대 5장까지 등록할 수 있습니다.</p>;
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsPending(true);
    setState(initialState);
    try {
      const { urls, invalidCount } = await stageFilesToBlob("thumb", Array.from(fileList));
      const result = await uploadThumbnailAction(productId, urls, invalidCount);
      setState(result);
    } catch (err) {
      setState({
        ok: false,
        message: err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs text-gray-500">
        파일 선택
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={isPending}
          className="text-xs"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-gray-500">
        폴더 선택
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // PC 폴더를 통째로 선택하면 안의 이미지 파일이 한 번에 업로드된다(표준 file input
          // 타입에는 없지만 크로미움/사파리 계열 브라우저가 공통으로 지원하는 속성).
          {...{ webkitdirectory: "", directory: "" }}
          disabled={isPending}
          className="text-xs"
          onChange={(e) => handleFiles(e.currentTarget.files)}
        />
      </label>
      <p className="text-[11px] text-gray-400">
        {`폴더를 선택하면 그 안의 이미지가 최대 ${remainingSlots}장까지 자동으로 업로드됩니다.`}
      </p>
      {isPending && <p className="text-xs text-primary">업로드 중...</p>}
      {!isPending && state.message && (
        <p className={`text-xs ${state.ok ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
      )}
    </div>
  );
}
