"use client";

import { useState } from "react";

export function ReferralLinkBox({ referralUrl }: { referralUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근이 막힌 환경(구형 브라우저 등)에서는 조용히 무시한다.
    }
  }

  async function handleShare() {
    // 카카오톡 등 설치된 앱으로 바로 공유되는 기본 공유시트 (모바일 브라우저 대부분 지원).
    // 지원 안 하는 환경(대부분 데스크톱)에서는 링크 복사로 대체한다.
    if (navigator.share) {
      try {
        await navigator.share({
          title: "싱싱콕 친구 초대",
          text: "싱싱콕에서 친구 초대하면 둘 다 1,000포인트! 아래 링크로 가입해보세요.",
          url: referralUrl,
        });
      } catch {
        // 사용자가 공유를 취소한 경우 등 - 별도 처리 없이 조용히 무시한다.
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={referralUrl}
        onFocus={(e) => e.target.select()}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-600 bg-white"
      />
      <button
        type="button"
        onClick={handleShare}
        className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover"
      >
        공유하기
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:border-primary"
      >
        {copied ? "복사됨!" : "링크 복사"}
      </button>
    </div>
  );
}
