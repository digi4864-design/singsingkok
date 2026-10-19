"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import { createReviewAction, deleteMyReviewAction, type ReviewState } from "@/app/products/[id]/reviewActions";

const initialState: ReviewState = { ok: false, message: "" };

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_SIZE_MB = 15;
const MAX_REVIEW_IMAGES = 3;

export function ReviewForm({
  productId,
  existing,
}: {
  productId: string;
  existing: { rating: number; content: string } | null;
}) {
  const boundAction = createReviewAction.bind(null, productId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [fileError, setFileError] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // 사진을 고른 즉시 브라우저에서 Vercel Blob으로 직접 올린다(Server Action을 거치지
  // 않음) - 고화질 사진을 첨부해 제출하면 Server Action 요청 본문이 Vercel Functions의
  // 4.5MB 한도를 넘어 업로드가 통째로 실패하고, 그 과정에서 입력하던 리뷰 내용까지 같이
  // 사라지는 문제가 실제로 있었다. 사진은 여기서 먼저 올려 작은 URL만 폼에 담아 제출한다.
  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_REVIEW_IMAGES);
    if (files.length === 0) return;

    const invalid = files.find((f) => !ALLOWED_IMAGE_TYPES.has(f.type));
    const tooLarge = files.find((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (invalid) {
      setFileError("jpg/png/webp/gif 사진만 첨부할 수 있어요.");
      e.target.value = "";
      return;
    }
    if (tooLarge) {
      setFileError(`"${tooLarge.name}" 사진이 ${MAX_FILE_SIZE_MB}MB를 넘어요. 더 작은 사진으로 다시 선택해주세요.`);
      e.target.value = "";
      return;
    }

    setFileError("");
    setUploadingImages(true);
    try {
      const uploaded = await Promise.all(
        files.map((file, i) => {
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const path = `review-staging/${productId}-${Date.now()}-${i}.${ext}`;
          return upload(path, file, { access: "public", handleUploadUrl: "/api/reviews/blob-upload" });
        })
      );
      setImageUrls(uploaded.map((b) => b.url));
    } catch {
      setFileError("사진 업로드에 실패했어요. 다시 시도해주세요.");
      e.target.value = "";
    } finally {
      setUploadingImages(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">평점</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl leading-none ${n <= rating ? "text-amber-400" : "text-gray-200"}`}
                aria-label={`${n}점`}
              >
                ★
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={rating} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">리뷰 내용</label>
          <textarea
            name="content"
            defaultValue={existing?.content}
            rows={3}
            placeholder="상품에 대한 솔직한 후기를 남겨주세요."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            사진 첨부 (선택, 최대 {MAX_REVIEW_IMAGES}장 · 장당 {MAX_FILE_SIZE_MB}MB 이하, 고화질도 가능)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploadingImages}
            onChange={handleFilesChange}
            className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-xs file:bg-white"
          />
          {imageUrls.map((url) => (
            <input key={url} type="hidden" name="imageUrls" value={url} />
          ))}
          {uploadingImages && <p className="text-xs text-primary mt-1">사진 업로드 중...</p>}
          {!uploadingImages && imageUrls.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{imageUrls.length}장 첨부됨</p>
          )}
          {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
        </div>
        {state.message && (
          <p className={`text-xs ${state.ok ? "text-primary" : "text-red-500"}`}>{state.message}</p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || uploadingImages}
            className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {existing ? "리뷰 수정" : "리뷰 등록"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={() => deleteMyReviewAction(productId)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              내 리뷰 삭제
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
