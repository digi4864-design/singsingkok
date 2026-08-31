"use client";

import { useState, useTransition } from "react";
import { bulkSetOriginAction } from "./actions";

export function BulkOriginForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [origin, setOrigin] = useState("");
  const [onlyEmpty, setOnlyEmpty] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !origin.trim()) return;
    setResult(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("categoryId", categoryId);
      formData.set("origin", origin.trim());
      if (onlyEmpty) formData.set("onlyEmpty", "on");
      const res = await bulkSetOriginAction(formData);
      const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
      setResult(`"${categoryName}" 카테고리 상품 ${res.count}건에 원산지 "${origin.trim()}"를 적용했습니다.`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">카테고리</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm w-40"
          >
            <option value="">선택</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">원산지</label>
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="예: 국산, 미국산 등"
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm w-40"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !categoryId || !origin.trim()}
          className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
        >
          {isPending ? "적용 중..." : "일괄 적용"}
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={onlyEmpty}
          onChange={(e) => setOnlyEmpty(e.target.checked)}
        />
        원산지가 비어있는 상품만 채우기 (해제 시 기존 값도 덮어씀)
      </label>
      {result && <p className="text-xs text-gray-500">{result}</p>}
    </form>
  );
}
