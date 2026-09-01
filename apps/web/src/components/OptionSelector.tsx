"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatWon } from "@/lib/format";
import { QuantityStepper } from "@/components/QuantityStepper";

export interface OptionData {
  id: string;
  optionName: string;
  price: number;
  compliancePrice?: number | null;
  isAvailable: boolean;
}

export function OptionSelector({
  product,
  options,
}: {
  product: { id: string; name: string; thumbnailUrl: string | null };
  options: OptionData[];
}) {
  const { addItem } = useCart();
  const router = useRouter();

  const defaultOption = useMemo(
    () => options.find((o) => o.isAvailable) ?? options[0],
    [options]
  );
  const [optionId, setOptionId] = useState(defaultOption?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const selected = options.find((o) => o.id === optionId);
  const hasDiscount = Boolean(
    selected?.compliancePrice && selected.compliancePrice > selected.price
  );
  const discountPercent =
    hasDiscount && selected ? Math.round((1 - selected.price / selected.compliancePrice!) * 100) : 0;

  function handleAdd() {
    if (!selected) return;
    addItem(
      {
        optionId: selected.id,
        productId: product.id,
        productName: product.name,
        optionName: selected.optionName,
        price: selected.price,
        thumbnailUrl: product.thumbnailUrl,
      },
      quantity
    );
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 3000);
  }

  function handleBuyNow() {
    handleAdd();
    router.push("/cart");
  }

  if (options.length === 0) {
    return <p className="text-sm text-gray-400">현재 구매 가능한 옵션이 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="option" className="block text-sm font-medium text-gray-700 mb-1.5">
          옵션 선택
        </label>
        <select
          id="option"
          value={optionId}
          onChange={(e) => setOptionId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id} disabled={!o.isAvailable}>
              {o.optionName} · {formatWon(o.price)}
              {!o.isAvailable ? " (품절)" : ""}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div>
          {hasDiscount && (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-red-500 font-bold text-sm">{discountPercent}% 할인</span>
              <span className="text-gray-400 text-sm line-through">
                {formatWon(selected.compliancePrice!)}
              </span>
            </div>
          )}
          <p className="text-2xl font-bold text-gray-900">{formatWon(selected.price * quantity)}</p>
        </div>
      )}

      {selected?.isAvailable ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">수량</span>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              className="flex-1 py-3 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 active:bg-primary/10 active:scale-[0.98] transition"
            >
              장바구니 담기
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover active:scale-[0.98] transition"
            >
              바로 구매
            </button>
          </div>
        </div>
      ) : (
        <button
          disabled
          className="w-full py-3 rounded-lg bg-gray-200 text-gray-400 font-medium cursor-not-allowed"
        >
          품절된 옵션입니다
        </button>
      )}

      <div
        role="status"
        aria-live="polite"
        className={`fixed inset-x-0 bottom-20 md:inset-x-auto md:bottom-8 md:right-8 z-50 flex justify-center md:justify-end px-4 md:px-0 transition-all duration-300 ${
          showToast
            ? "opacity-100 translate-y-0"
            : "pointer-events-none opacity-0 translate-y-2 md:translate-y-0 md:translate-x-2"
        }`}
      >
        <div className="flex items-center gap-3 bg-gray-900 text-white text-sm rounded-full pl-4 pr-2 py-2 shadow-lg max-w-full">
          <span className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs">
            ✓
          </span>
          <span className="truncate">장바구니에 담았어요</span>
          <Link
            href="/cart"
            className="shrink-0 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1 text-xs font-medium transition"
          >
            장바구니 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
