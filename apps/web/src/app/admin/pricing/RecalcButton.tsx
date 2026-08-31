"use client";

import { useState, useTransition } from "react";
import { recalcAllPricesAction } from "./actions";

export function RecalcButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const res = await recalcAllPricesAction();
      setResult(
        `재계산 완료: ${res.updated}건 처리됨 (수동 설정 ${res.skippedManual}건은 유지됨)`
      );
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? "재계산 중..." : "전체 상품 판매가 재계산"}
      </button>
      {result && <p className="mt-2 text-sm text-gray-600">{result}</p>}
    </div>
  );
}
