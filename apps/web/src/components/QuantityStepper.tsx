"use client";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden select-none">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 flex items-center justify-center text-gray-600 text-lg active:bg-gray-100 transition"
        aria-label="수량 감소"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium text-gray-900" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-9 h-9 flex items-center justify-center text-gray-600 text-lg active:bg-gray-100 transition"
        aria-label="수량 증가"
      >
        +
      </button>
    </div>
  );
}
