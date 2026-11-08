// Money maths for the register. All amounts are rounded to cents at every step so totals never drift.
export const round2 = (n: number) => Math.round((Number(n) || 0) * 100 + (n < 0 ? -1e-9 : 1e-9)) / 100;

export interface Totals { subtotal: number; discount: number; tax: number; total: number }

/** discount is clamped to 0..subtotal; tax applies to the discounted amount. */
export function calcTotals(lines: { price: number; qty: number }[], discount: number, taxRatePct: number): Totals {
  const subtotal = round2(lines.reduce((a, l) => a + round2(l.price * l.qty), 0));
  const d = round2(Math.min(Math.max(Number(discount) || 0, 0), subtotal));
  const tax = round2((subtotal - d) * ((Number(taxRatePct) || 0) / 100));
  return { subtotal, discount: d, tax, total: round2(subtotal - d + tax) };
}

export const lineTotal = (price: number, qty: number) => round2(price * qty);

/** 'YYMMDD-0001' */
export function receiptNumber(seq: number, now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(now.getFullYear()).slice(2)}${p(now.getMonth() + 1)}${p(now.getDate())}-${String(seq).padStart(4, '0')}`;
}
