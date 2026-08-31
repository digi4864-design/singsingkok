"use client";

import { openDaumPostcode, type DaumPostcodeResult } from "@/lib/daumPostcode";

export function AddressSearchButton({ onSelect }: { onSelect: (result: DaumPostcodeResult) => void }) {
  return (
    <button
      type="button"
      onClick={() => openDaumPostcode(onSelect)}
      className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:border-primary whitespace-nowrap shrink-0"
    >
      우편번호 검색
    </button>
  );
}
