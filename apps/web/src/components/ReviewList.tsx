"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export interface ReviewItem {
  id: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: Date;
  user: { name: string | null };
}

// 리뷰 사진을 누르면 새 탭에 원본 이미지 하나만 뜨던 것을, 페이지 안에서 좌우로 넘겨가며
// 볼 수 있는 라이트박스로 바꾼다. 리뷰별로 따로 놀지 않고, 이 목록에 있는 모든 리뷰 사진을
// 하나로 이어서 넘길 수 있게 한다(리뷰 한 개당 사진이 최대 3장뿐이라 리뷰 단위로 끊으면
// 넘기는 의미가 별로 없음).
export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  const allPhotos = reviews.flatMap((r) => r.images.map((src) => ({ src, reviewId: r.id })));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function openPhoto(src: string) {
    const index = allPhotos.findIndex((p) => p.src === src);
    if (index >= 0) setOpenIndex(index);
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-400">아직 등록된 리뷰가 없습니다.</p>;
  }

  return (
    <>
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 text-sm">{"★".repeat(r.rating)}</span>
              <span className="text-xs text-gray-400">{r.user.name ?? "구매자"}</span>
              <span className="text-xs text-gray-300">{r.createdAt.toLocaleDateString("ko-KR")}</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
            {r.images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {r.images.map((src) => (
                  <button key={src} type="button" onClick={() => openPhoto(src)} className="shrink-0">
                    <Image
                      src={src}
                      alt="리뷰 사진"
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                    />
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <PhotoLightbox
          photos={allPhotos.map((p) => p.src)}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}

function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const touchStartX = useRef<number | null>(null);

  const goPrev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const goNext = () => onIndexChange((index + 1) % photos.length);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        if (deltaX > 50) goPrev();
        else if (deltaX < -50) goNext();
        touchStartX.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center"
      >
        ×
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="이전 사진"
          className="absolute left-2 sm:left-6 text-white text-4xl leading-none w-12 h-12 flex items-center justify-center"
        >
          ‹
        </button>
      )}

      <div className="relative w-full h-full max-w-2xl max-h-[80vh] mx-4" onClick={(e) => e.stopPropagation()}>
        <Image src={photos[index]} alt="리뷰 사진" fill className="object-contain" sizes="100vw" />
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="다음 사진"
          className="absolute right-2 sm:right-6 text-white text-4xl leading-none w-12 h-12 flex items-center justify-center"
        >
          ›
        </button>
      )}

      {photos.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  );
}
