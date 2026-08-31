"use client";

import { useState, useTransition } from "react";
import { resyncThumbnailsAction } from "./resyncActions";

const BATCH_SIZE = 15;
// 연속으로 이만큼의 배치에서 갱신 건수가 0이면(=매칭 안 되는 상품들만 남음) 무한 반복을
// 멈추고 admin에게 알린다.
const MAX_STALLED_BATCHES = 3;

export function ResyncThumbnailsButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ updated: number; skipped: number; failed: number } | null>(
    null
  );

  function handleClick() {
    setMessage(null);
    setProgress({ updated: 0, skipped: 0, failed: 0 });

    startTransition(async () => {
      let totals = { updated: 0, skipped: 0, failed: 0 };
      let stalledBatches = 0;

      while (true) {
        const res = await resyncThumbnailsAction(BATCH_SIZE);
        if (!res.ok) {
          setMessage(res.message);
          return;
        }
        totals = {
          updated: totals.updated + res.updated,
          skipped: totals.skipped + res.skipped,
          failed: totals.failed + res.failed,
        };
        setProgress(totals);

        if (res.remaining === 0) {
          setMessage(`완료: 총 ${totals.updated}건 갱신, ${totals.skipped}건 건너뜀, ${totals.failed}건 실패`);
          return;
        }

        stalledBatches = res.updated === 0 ? stalledBatches + 1 : 0;
        if (stalledBatches >= MAX_STALLED_BATCHES) {
          setMessage(
            `중단: 남은 ${res.remaining}건은 구글 드라이브에서 자동으로 매칭되지 않습니다. ` +
              `상품명과 드라이브 폴더명이 일치하는지 확인해주세요. (지금까지 ${totals.updated}건 갱신)`
          );
          return;
        }
      }
    });
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">이미지/카테고리 재점검</h2>
      <p className="text-xs text-gray-500 mb-3">
        썸네일·상세이미지·카테고리 중 비어 있는 항목만 구글 드라이브 기준으로 채웁니다. 이미
        값이 있는 항목(직접 업로드 포함)은 건드리지 않습니다. 상품이 많으면 자동으로 여러
        번에 나눠 처리되며, 시간이 몇 분 걸릴 수 있으니 완료될 때까지 이 페이지를 벗어나지
        말아주세요.
      </p>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="px-4 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-50"
      >
        {isPending ? "처리 중... (페이지를 벗어나지 마세요)" : "이미지/카테고리 재점검 실행"}
      </button>
      {isPending && progress && (
        <p className="mt-2 text-xs text-gray-400">
          진행 중: {progress.updated}건 갱신, {progress.skipped}건 건너뜀, {progress.failed}건 실패
        </p>
      )}
      {message && <p className="mt-2 text-xs text-gray-600">{message}</p>}
    </div>
  );
}
