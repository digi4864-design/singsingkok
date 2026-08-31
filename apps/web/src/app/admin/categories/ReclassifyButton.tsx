"use client";

import { useState, useTransition } from "react";
import { runCategoryRulesAction } from "./actions";

export function ReclassifyButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await runCategoryRulesAction();
      setResult(
        `완료: [은하수산] 상품 ${res.eunhasu}건 → "은하수산" 카테고리 / 미분류 상품 ${res.unassigned}건 → "미지정" 카테고리`
      );
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
      >
        {isPending ? "정리 중..." : "카테고리 자동 정리 실행"}
      </button>
      {result && <p className="mt-2 text-xs text-gray-500">{result}</p>}
    </div>
  );
}
