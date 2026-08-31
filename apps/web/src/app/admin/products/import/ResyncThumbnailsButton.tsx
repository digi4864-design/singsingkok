"use client";

import { useState, useTransition } from "react";
import { resyncThumbnailsAction } from "./resyncActions";

export function ResyncThumbnailsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await resyncThumbnailsAction();
      setResult(res.message);
    });
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">기존 상품 이미지/카테고리 재점검</h2>
      <p className="text-xs text-gray-500 mb-3">
        썸네일·상세이미지·카테고리 중 비어 있는 항목만 구글 드라이브 기준으로 다시 채웁니다.
        이미 값이 있는 항목(직접 업로드 포함)은 건드리지 않습니다. 상품이 많으면 몇 분 정도
        걸릴 수 있습니다.
      </p>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
      >
        {isPending ? "재동기화 중... (잠시만 기다려주세요)" : "이미지/카테고리 재점검 실행"}
      </button>
      {result && <p className="mt-2 text-xs text-gray-500">{result}</p>}
    </div>
  );
}
