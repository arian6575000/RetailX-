const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());

export function addDays(n: number, from?: string): string {
  const d = from ? parseYmd(from) : new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
}
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export function daysFromToday(s: string): number | null {
  if (!s || !/^\d{4}-\d\d-\d\d$/.test(s)) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((parseYmd(s).getTime() - now.getTime()) / 86400000);
}
export function monthRange(y: number, m: number): [string, string] {
  return [`${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-31`];
}

// ---- epoch-ms helpers (sales are stored with a timestamp) ----
export const startOfDayMs = (ts: number = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const endOfDayMs = (ts: number = Date.now()) => { const d = new Date(ts); d.setHours(23, 59, 59, 999); return d.getTime(); };
/** Start of the day `n` days before today (n = 0 -> today). Uses calendar days, so daylight-saving changes cannot skip a day. */
export const daysAgoMs = (n: number, from: number = Date.now()) => { const d = new Date(from); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d.getTime(); };
