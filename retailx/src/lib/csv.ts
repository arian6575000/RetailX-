// CSV export. Cells that start with = + - @ are prefixed with ' so spreadsheets never run them as formulas.
// The company credit is always the last line (standing rule for every export).
import { CREDIT } from './brand';

const cell = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n' + cell(CREDIT) + '\r\n';
}
