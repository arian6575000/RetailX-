// Receipt HTML (for printing / PDF). Pure: no native modules. pageHtml() adds the company credit footer.
import type { Sale, SaleItem, Settings } from '../db/types';
import { escapeHtml as h, pageHtml } from './pageHtml';

const money = (n: number, cur: string) => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const [i, f] = Math.abs(v).toFixed(Number.isInteger(v) ? 0 : 2).split('.');
  return `${v < 0 ? '-' : ''}${cur} ${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${f ? '.' + f : ''}`;
};
export const fmtDateTime = (ts: number) => {
  const d = new Date(ts); const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const widthOf = (f: Settings['receiptFormat']) => (f === 'thermal58' ? 58 : f === 'a4' ? 0 : 80);

export function receiptBody(o: { settings: Settings; sale: Sale; items: SaleItem[]; cashier?: string; customer?: string }): string {
  const { settings: s, sale, items } = o; const cur = s.currency;
  const row = (a: string, b: string, bold = false) => `<div class="r${bold ? ' b' : ''}"><span>${a}</span><span>${b}</span></div>`;
  return [
    `<div class="c b" style="font-size:1.2em">${h(s.businessName)}</div>`,
    s.address ? `<div class="c">${h(s.address)}</div>` : '', s.phone ? `<div class="c">${h(s.phone)}</div>` : '',
    '<hr/>',
    row('Receipt', `#${h(sale.number)}`), row('Date', fmtDateTime(sale.createdAt)),
    o.cashier ? row('Cashier', h(o.cashier)) : '', o.customer ? row('Customer', h(o.customer)) : '',
    sale.status === 'refunded' ? `<div class="c b" style="margin:4px 0">*** REFUNDED ***</div>` : '',
    '<hr/>',
    items.map((i) => row(`${h(i.name)} x${i.qty}`, money(i.lineTotal, cur))).join(''),
    '<hr/>',
    row('Subtotal', money(sale.subtotal, cur)),
    sale.discount ? row('Discount', '-' + money(sale.discount, cur)) : '',
    sale.tax ? row(`Tax${s.taxRate ? ` (${s.taxRate}%)` : ''}`, money(sale.tax, cur)) : '',
    row('Total', money(sale.total, cur), true),
    row('Paid via', h(sale.paymentMethod)),
    sale.paymentMethod === 'cash' && sale.tendered != null ? row('Received', money(sale.tendered, cur)) + row('Change', money(Math.max(0, sale.tendered - sale.total), cur)) : '',
    '<hr/>',
    s.receiptFooter ? `<div class="c">${h(s.receiptFooter)}</div>` : '',
  ].join('');
}

export const receiptHtml = (o: Parameters<typeof receiptBody>[0]) => pageHtml(receiptBody(o), widthOf(o.settings.receiptFormat));
