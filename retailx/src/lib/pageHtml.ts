// Pure HTML helpers for print / PDF (no native modules, testable in Node).
import { CREDIT } from './brand';

export const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export const creditHtml = () => `<div style="text-align:center;font-size:10px;color:#666;margin-top:14px;border-top:1px dashed #bbb;padding-top:6px">${escapeHtml(CREDIT)}</div>`;

/** Wraps body HTML in a page that ALWAYS ends with the company credit. `widthMm` = 80/58 for thermal paper, 0 for A4. */
export function pageHtml(body: string, widthMm = 80): string {
  const w = widthMm ? `width:${widthMm - 8}mm;` : '';
  return `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
    @page{margin:${widthMm ? '4mm' : '14mm'}} body{font-family:Arial,Helvetica,sans-serif;font-size:${widthMm === 58 ? 10 : 12}px;color:#000;margin:0 auto;${w}}
    .c{text-align:center}.b{font-weight:700}.r{display:flex;justify-content:space-between;gap:8px}hr{border:0;border-top:1px dashed #999;margin:6px 0}
    table{width:100%;border-collapse:collapse}td,th{padding:3px 2px;text-align:left}th{border-bottom:1px solid #999}td.n,th.n{text-align:right}
    h1{font-size:${widthMm ? 14 : 18}px;margin:0 0 6px}h2{font-size:${widthMm ? 12 : 14}px;margin:12px 0 4px}
  </style></head><body>${body}${creditHtml()}</body></html>`;
}
