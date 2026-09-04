"use client";

import Image from "next/image";
import { useActionState } from "react";
import { postProductToInstagramAction, type PostState } from "./actions";

const initialState: PostState = { ok: true, message: "" };

export function InstagramPostCard({
  productId,
  productName,
  thumbnailUrl,
  imageCount,
  defaultCaption,
}: {
  productId: string;
  productName: string;
  thumbnailUrl: string;
  imageCount: number;
  defaultCaption: string;
}) {
  const [state, formAction, isPending] = useActionState(postProductToInstagramAction, initialState);
  const posted = state.ok && state.message !== "";

  return (
    <div className="border border-gray-200 rounded-lg p-4 flex gap-4">
      <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <Image src={thumbnailUrl} alt="" fill className="object-cover" />
      </div>
      <form action={formAction} className="flex-1 min-w-0">
        <input type="hidden" name="productId" value={productId} />
        <p className="text-sm font-medium text-gray-900 mb-0.5">{productName}</p>
        <p className="text-xs text-gray-400 mb-1.5">
          {imageCount > 1 ? `사진 ${imageCount}장 (여러 장 게시)` : "사진 1장"}
        </p>
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
