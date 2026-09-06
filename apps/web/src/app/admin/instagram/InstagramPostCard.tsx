"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { postProductToInstagramAction, previewOverlayAction, type PostState } from "./actions";

const initialState: PostState = { ok: true, message: "" };

export function InstagramPostCard({
  productId,
  productName,
  thumbnailUrl,
  imageCount,
  defaultCaption,
  defaultBadge,
}: {
  productId: string;
  productName: string;
  thumbnailUrl: string;
  imageCount: number;
  defaultCaption: string;
  defaultBadge: { headline: string; subline: string };
}) {
  const [state, formAction, isPending] = useActionState(postProductToInstagramAction, initialState);
  const posted = state.ok && state.message !== "";

  const [headline, setHeadline] = useState(defaultBadge.headline);
  const [subline, setSubline] = useState(defaultBadge.subline);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [isPreviewPending, startPreviewTransition] = useTransition();

  function handlePreview() {
    setPreviewError("");
    startPreviewTransition(async () => {
      const result = await previewOverlayAction(thumbnailUrl, headline, subline);
      if (result.ok && result.dataUrl) {
        setPreviewUrl(result.dataUrl);
      } else {
        setPreviewError(result.message ?? "미리보기 생성에 실패했습니다.");
      }
    });
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex gap-4">
      <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- 미리보기는 서버 액션이 돌려주는 data URL이라 next/image 최적화 대상이 아님 */}
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Image src={thumbnailUrl} alt="" fill className="object-cover" />
        )}
      </div>
      <form action={formAction} className="flex-1 min-w-0">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="headline" value={headline} />
        <input type="hidden" name="subline" value={subline} />
        <p className="text-sm font-medium text-gray-900 mb-0.5">{productName}</p>
        <p className="text-xs text-gray-400 mb-2">
          {imageCount > 1 ? `사진 ${imageCount}장 (여러 장 게시, 첫 장에만 문구 합성)` : "사진 1장"}
        </p>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            disabled={posted}
            placeholder="사진 위 큰 문구 (예: NEW 입고)"
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:bg-gray-50 disabled:text-gray-400"
          />
          <input
            type="text"
            value={subline}
            onChange={(e) => setSubline(e.target.value)}
            disabled={posted}
            placeholder="작은 보조 문구"
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="button"
            onClick={handlePreview}
            disabled={posted || isPreviewPending || !headline}
            className="shrink-0 px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isPreviewPending ? "생성 중..." : "미리보기"}
          </button>
        </div>
        {previewError && <p className="text-xs text-red-600 mb-2">{previewError}</p>}

        <textarea
          name="caption"
          defaultValue={defaultCaption}
          rows={5}
          disabled={posted}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="submit"
            disabled={isPending || posted}
            className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {posted ? "게시 완료" : isPending ? "게시 중..." : "인스타그램에 게시"}
          </button>
          {state.message && (
            <span className={`text-xs ${state.ok ? "text-green-600" : "text-red-600"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
