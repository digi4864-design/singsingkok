"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatWon } from "@/lib/format";

export default function CartPage() {
  const { items, removeItem, setQuantity, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 mb-4">장바구니가 비어 있습니다.</p>
        <Link href="/" className="text-primary hover:underline">
          상품 보러가기
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">장바구니</h1>

      <ul className="divide-y divide-gray-200 border-t border-b border-gray-200">
        {items.map((item) => (
          <li key={item.optionId} className="py-4 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
              {item.thumbnailUrl && (
                <Image src={item.thumbnailUrl} alt={item.productName} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate">{item.productName}</p>
              <p className="text-xs text-gray-500 truncate">{item.optionName}</p>
              <p className="text-sm font-medium text-gray-900">{formatWon(item.price)}</p>
            </div>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => setQuantity(item.optionId, Math.max(1, Number(e.target.value) || 1))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center"
            />
            <button
              onClick={() => removeItem(item.optionId)}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-gray-600">총 결제금액</span>
        <span className="text-xl font-bold text-gray-900">{formatWon(totalPrice)}</span>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block w-full py-3.5 text-center rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
      >
        주문하기
      </Link>
    </main>
  );
}
