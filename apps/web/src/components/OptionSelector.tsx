"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatWon } from "@/lib/format";

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
            <label htmlFor="quantity" className="text-sm text-gray-600">
              수량
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
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
    </div>
  );
}
