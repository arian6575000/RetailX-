import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { CartLine, Product } from '../db/types';
import { calcTotals } from '../lib/calc';
import { useApp } from './AppContext';

interface Ctx {
  lines: CartLine[];
  add: (p: Product) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}
const CartCtx = createContext<Ctx>(null as any);
export const useCart = () => useContext(CartCtx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const add = useCallback((p: Product) => setLines((ls) => {
    const i = ls.findIndex((l) => l.productId === p.id);
    if (i >= 0) return ls.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l));
    return [...ls, { productId: p.id, name: p.name, price: p.price, qty: 1, unit: p.unit }];
  }), []);
  const setQty = useCallback((id: number, qty: number) => setLines((ls) => (qty > 0 ? ls.map((l) => (l.productId === id ? { ...l, qty } : l)) : ls.filter((l) => l.productId !== id))), []);
  const remove = useCallback((id: number) => setLines((ls) => ls.filter((l) => l.productId !== id)), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo<Ctx>(() => ({
    lines, add, setQty, remove, clear,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: calcTotals(lines, 0, 0).subtotal,
  }), [lines, add, setQty, remove, clear]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
