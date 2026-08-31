"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  optionId: string;
  productId: string;
  productName: string;
  optionName: string;
  price: number;
  thumbnailUrl: string | null;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (optionId: string) => void;
  setQuantity: (optionId: string, quantity: number) => void;
  clear: () => void;
  totalCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "farm-mall-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // 손상된 로컬 데이터는 무시
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.optionId === item.optionId);
      if (existing) {
        return prev.map((i) =>
          i.optionId === item.optionId ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((optionId: string) => {
    setItems((prev) => prev.filter((i) => i.optionId !== optionId));
  }, []);

  const setQuantity = useCallback((optionId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.optionId === optionId ? { ...i, quantity } : i)).filter((i) => i.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addItem, removeItem, setQuantity, clear, totalCount, totalPrice }),
    [items, addItem, removeItem, setQuantity, clear, totalCount, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart는 CartProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
