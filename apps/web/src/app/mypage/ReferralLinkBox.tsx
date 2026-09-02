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
        onClick={handleCopy}
        className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover"
      >
        {copied ? "복사됨!" : "링크 복사"}
      </button>
    </div>
  );
}
