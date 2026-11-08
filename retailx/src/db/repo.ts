// RetailX data layer. All SQL goes through the small `Db` interface so the same code runs on expo-sqlite (app) and node:sqlite (tests).
// Business rules (stock, totals, receipt numbers, last-admin, unique PINs/barcodes) live HERE, not in the screens.
import type { Db } from './schema';
import { migrate } from './schema';
import { MIGRATIONS } from './migrations';
import { BACKUP_TABLES } from './tables';
import {
  Customer, DEFAULT_SETTINGS, Expense, NewSale, Product, Role, Sale, SaleItem, SaleStatus, Settings, Staff, PayMethod,
} from './types';
import { calcTotals, lineTotal, receiptNumber, round2 } from '../lib/calc';
import { daysAgoMs, endOfDayMs, startOfDayMs, ymd } from '../lib/dates';
import { newSalt, same, stretch } from '../lib/pinHash';

let db: Db;
export async function initRepo(d: Db) { db = d; await migrate(d, MIGRATIONS); }
export const getDb = () => db;

/** Errors the UI turns into messages: code is a dictionary key. */
export class AppError extends Error {
  constructor(public code: string, public detail?: string) { super(code + (detail ? `: ${detail}` : '')); }
}
export const parseJson = <T,>(s: any, fallback: T): T => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
const num = (v: any) => Number(v) || 0;
const nn = (v: any): number | null => (v == null ? null : Number(v));

// ---------- row mappers ----------
const toStaff = (r: any): Staff => ({ id: r.id, name: r.name, role: r.role === 'admin' ? 'admin' : 'cashier', active: !!r.active, createdAt: r.created_at });
const toProduct = (r: any): Product => ({
  id: r.id, name: r.name, category: r.category, price: r.price, cost: nn(r.cost), stock: nn(r.stock), unit: r.unit, barcode: r.barcode, sku: r.sku, createdAt: r.created_at,
});
const toCustomer = (r: any): Customer => ({
  id: r.id, name: r.name, phone: r.phone, notes: r.notes, totalSpent: r.total_spent, visits: r.visits, lastVisit: nn(r.last_visit), createdAt: r.created_at,
});
const toSale = (r: any): Sale => ({
  id: r.id, number: r.number, subtotal: r.subtotal, discount: r.discount, tax: r.tax, total: r.total, paymentMethod: r.payment_method as PayMethod,
  tendered: nn(r.tendered), customerId: r.customer_id ?? null, staffId: r.staff_id ?? null, status: r.status as SaleStatus, refundedAt: nn(r.refunded_at), createdAt: r.created_at,
});
const toItem = (r: any): SaleItem => ({
  id: r.id, saleId: r.sale_id, productId: r.product_id ?? null, name: r.name, category: r.category, price: r.price, cost: nn(r.cost), qty: r.qty, lineTotal: r.line_total,
});
const toExpense = (r: any): Expense => ({ id: r.id, date: r.date, category: r.category, amount: r.amount, note: r.note, staffId: r.staff_id ?? null, createdAt: r.created_at });

const METHODS: PayMethod[] = ['cash', 'card', 'split'];
const PIN_RE = /^\d{4}$/;

export const Repo = {
  // ---------------- Settings ----------------
  async getSettings(): Promise<Settings> {
    const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM settings WHERE id = ?', ['main']);
    if (!row) { await db.runAsync('INSERT INTO settings (id, data) VALUES (?, ?)', ['main', JSON.stringify(DEFAULT_SETTINGS)]); return { ...DEFAULT_SETTINGS }; }
    return { ...DEFAULT_SETTINGS, ...parseJson<Partial<Settings>>(row.data, {}) };
  },
  async saveSettings(s: Settings): Promise<Settings> {
    const clean: Settings = { ...s, taxRate: Math.min(100, Math.max(0, num(s.taxRate))), lowStockThreshold: Math.max(0, Math.floor(num(s.lowStockThreshold))) };
    await db.runAsync('INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)', ['main', JSON.stringify(clean)]);
    return clean;
  },
  async markBackup() { const s = await Repo.getSettings(); s.lastBackupAt = Date.now(); await Repo.saveSettings(s); },

  // ---------------- Products ----------------
  async listProducts(): Promise<Product[]> { return (await db.getAllAsync<any>('SELECT * FROM products ORDER BY name COLLATE NOCASE')).map(toProduct); },
  async getProduct(id: number): Promise<Product | null> { const r = await db.getFirstAsync<any>('SELECT * FROM products WHERE id = ?', [id]); return r ? toProduct(r) : null; },
  async findByBarcode(code: string): Promise<Product | null> {
    const c = code.trim(); if (!c) return null;
    const r = await db.getFirstAsync<any>('SELECT * FROM products WHERE barcode = ? LIMIT 1', [c]); return r ? toProduct(r) : null;
  },
  async saveProduct(p: Partial<Product> & { name: string; price: number }): Promise<number> {
    const name = p.name.trim(); if (!name) throw new AppError('nameRequired');
    const price = round2(p.price); if (!(price >= 0)) throw new AppError('invalidPrice');
    const barcode = (p.barcode || '').trim();
    if (barcode) {
      const dup = await db.getFirstAsync<any>('SELECT id FROM products WHERE barcode = ? AND id <> ?', [barcode, p.id ?? -1]);
      if (dup) throw new AppError('barcodeExists');
    }
    const stock = p.stock == null || (p.stock as any) === '' ? null : Math.max(0, num(p.stock));
    const cost = p.cost == null || (p.cost as any) === '' ? null : Math.max(0, round2(p.cost));
    const vals = [name, (p.category || '').trim() || 'Uncategorized', price, cost, stock, (p.unit || '').trim() || 'ea', barcode, (p.sku || '').trim()];
    if (p.id) {
      await db.runAsync('UPDATE products SET name=?, category=?, price=?, cost=?, stock=?, unit=?, barcode=?, sku=? WHERE id=?', [...vals, p.id]);
      return p.id;
    }
    const r = await db.runAsync('INSERT INTO products (name, category, price, cost, stock, unit, barcode, sku, created_at) VALUES (?,?,?,?,?,?,?,?,?)', [...vals, Date.now()]);
    return r.lastInsertRowId;
  },
  async deleteProduct(id: number) { await db.runAsync('DELETE FROM products WHERE id = ?', [id]); }, // sale_items keep their snapshot (product_id -> NULL)
  async categories(): Promise<string[]> { return (await db.getAllAsync<{ category: string }>('SELECT DISTINCT category FROM products ORDER BY category COLLATE NOCASE')).map((r) => r.category); },
  async lowStockProducts(): Promise<Product[]> {
    const t = (await Repo.getSettings()).lowStockThreshold;
    return (await db.getAllAsync<any>('SELECT * FROM products WHERE stock IS NOT NULL AND stock <= ? ORDER BY stock, name', [t])).map(toProduct);
  },
  /** Bulk insert used for the optional demo catalogue. */
  async addProducts(rows: [string, string, number, string, string, string, number][]) {
    await db.withTransactionAsync(async () => {
      for (const [name, category, price, unit, barcode, sku, stock] of rows)
        await db.runAsync('INSERT INTO products (name, category, price, cost, stock, unit, barcode, sku, created_at) VALUES (?,?,?,?,?,?,?,?,?)', [name, category, price, null, stock, unit, barcode, sku, Date.now()]);
    });
  },

  // ---------------- Customers ----------------
  async listCustomers(): Promise<Customer[]> { return (await db.getAllAsync<any>('SELECT * FROM customers ORDER BY name COLLATE NOCASE')).map(toCustomer); },
  async getCustomer(id: number): Promise<Customer | null> { const r = await db.getFirstAsync<any>('SELECT * FROM customers WHERE id = ?', [id]); return r ? toCustomer(r) : null; },
  async saveCustomer(c: { id?: number; name: string; phone?: string; notes?: string }): Promise<number> {
    const name = c.name.trim(); if (!name) throw new AppError('nameRequired');
    if (c.id) { await db.runAsync('UPDATE customers SET name=?, phone=?, notes=? WHERE id=?', [name, (c.phone || '').trim(), (c.notes || '').trim(), c.id]); return c.id; }
    const r = await db.runAsync('INSERT INTO customers (name, phone, notes, created_at) VALUES (?,?,?,?)', [name, (c.phone || '').trim(), (c.notes || '').trim(), Date.now()]);
    return r.lastInsertRowId;
  },
  async deleteCustomer(id: number) { await db.runAsync('DELETE FROM customers WHERE id = ?', [id]); },

  // ---------------- Staff ----------------
  async listStaff(): Promise<Staff[]> { return (await db.getAllAsync<any>('SELECT * FROM staff ORDER BY name COLLATE NOCASE')).map(toStaff); },
  async getStaff(id: number): Promise<Staff | null> { const r = await db.getFirstAsync<any>('SELECT * FROM staff WHERE id = ?', [id]); return r ? toStaff(r) : null; },
  async anyStaffExists(): Promise<boolean> { return ((await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM staff'))?.n ?? 0) > 0; },
  async countActiveStaff(): Promise<number> { return (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM staff WHERE active = 1'))?.n ?? 0; },
  async _pinTaken(pin: string, exceptId = -1): Promise<boolean> {
    const rows = await db.getAllAsync<any>('SELECT pin_hash, pin_salt FROM staff WHERE active = 1 AND id <> ?', [exceptId]);
    return rows.some((r) => same(stretch(pin, r.pin_salt), r.pin_hash));
  },
  async _activeAdmins(exceptId = -1): Promise<number> {
    return (await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM staff WHERE active = 1 AND role = 'admin' AND id <> ?", [exceptId]))?.n ?? 0;
  },
  async createStaff(s: { name: string; role: Role; pin: string }): Promise<number> {
    const name = s.name.trim(); if (!name) throw new AppError('nameRequired');
    if (!PIN_RE.test(s.pin)) throw new AppError('pin4');
    if (await Repo._pinTaken(s.pin)) throw new AppError('pinTaken');
    const salt = newSalt();
    const r = await db.runAsync('INSERT INTO staff (name, role, pin_hash, pin_salt, active, created_at) VALUES (?,?,?,?,1,?)', [name, s.role === 'admin' ? 'admin' : 'cashier', stretch(s.pin, salt), salt, Date.now()]);
    return r.lastInsertRowId;
  },
  /** pin is optional (omit to keep). Refuses to leave the shop without an active admin. */
  async updateStaff(id: number, s: { name?: string; role?: Role; active?: boolean; pin?: string }): Promise<void> {
    const cur = await db.getFirstAsync<any>('SELECT * FROM staff WHERE id = ?', [id]); if (!cur) return;
    const role = s.role ?? cur.role, active = s.active ?? !!cur.active;
    const name = (s.name ?? cur.name).trim(); if (!name) throw new AppError('nameRequired');
    if (cur.role === 'admin' && cur.active && (role !== 'admin' || !active) && (await Repo._activeAdmins(id)) === 0) throw new AppError('lastAdmin');
    let hash = cur.pin_hash, salt = cur.pin_salt;
    if (s.pin !== undefined) {
      if (!PIN_RE.test(s.pin)) throw new AppError('pin4');
      if (await Repo._pinTaken(s.pin, id)) throw new AppError('pinTaken');
      salt = newSalt(); hash = stretch(s.pin, salt);
    }
    await db.runAsync('UPDATE staff SET name=?, role=?, active=?, pin_hash=?, pin_salt=? WHERE id=?', [name, role === 'admin' ? 'admin' : 'cashier', active ? 1 : 0, hash, salt, id]);
  },
  async deleteStaff(id: number): Promise<void> {
    const cur = await db.getFirstAsync<any>('SELECT * FROM staff WHERE id = ?', [id]); if (!cur) return;
    if (cur.role === 'admin' && cur.active && (await Repo._activeAdmins(id)) === 0) throw new AppError('lastAdmin');
    await db.runAsync('DELETE FROM staff WHERE id = ?', [id]); // their sales stay (staff_id -> NULL)
  },
  /** Returns the active staff member whose PIN matches, else null. Callers must apply the shared lockout (lockoutGate/lockoutRecord). */
  async findStaffByPin(pin: string): Promise<Staff | null> {
    if (!PIN_RE.test(pin)) return null;
    const rows = await db.getAllAsync<any>('SELECT * FROM staff WHERE active = 1');
    let found: any = null;
    for (const r of rows) if (same(stretch(pin, r.pin_salt), r.pin_hash) && !found) found = r; // no early exit: constant work per attempt
    return found ? toStaff(found) : null;
  },
  async verifyStaffPin(id: number, pin: string): Promise<boolean> {
    const r = await db.getFirstAsync<any>('SELECT pin_hash, pin_salt FROM staff WHERE id = ? AND active = 1', [id]);
    return !!r && PIN_RE.test(pin) && same(stretch(pin, r.pin_salt), r.pin_hash);
  },

  // ---------------- Sales ----------------
  /** Atomic: receipt number, sale, items, stock and customer stats are written together or not at all. Totals are recomputed here. */
  async createSale(input: NewSale): Promise<Sale> {
    if (!input.lines.length) throw new AppError('cartEmpty');
    if (!METHODS.includes(input.paymentMethod)) throw new AppError('invalidPayment');
    for (const l of input.lines) if (!(l.qty > 0) || !(l.price >= 0)) throw new AppError('invalidLine');
    let saleId = 0;
    await db.withTransactionAsync(async () => {
      const settings = await Repo.getSettings();
      const totals = calcTotals(input.lines, input.discount, settings.taxRate);
      if (input.paymentMethod === 'cash' && round2(input.tendered ?? 0) < totals.total) throw new AppError('underpaid');
      const seq = settings.nextReceiptSeq || 1;
      await Repo.saveSettings({ ...settings, nextReceiptSeq: seq + 1 });
      const now = Date.now();
      const r = await db.runAsync(
        'INSERT INTO sales (number, subtotal, discount, tax, total, payment_method, tendered, customer_id, staff_id, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        [receiptNumber(seq, new Date(now)), totals.subtotal, totals.discount, totals.tax, totals.total, input.paymentMethod,
          input.paymentMethod === 'cash' ? round2(input.tendered ?? 0) : null, input.customerId ?? null, input.staffId ?? null, 'completed', now]);
      saleId = r.lastInsertRowId;
      // same product twice in the cart = one stock check against the combined qty
      const wanted = new Map<number, number>();
      for (const l of input.lines) wanted.set(l.productId, (wanted.get(l.productId) || 0) + l.qty);
      for (const l of input.lines) {
        const p = await db.getFirstAsync<any>('SELECT * FROM products WHERE id = ?', [l.productId]);
        if (!p) throw new AppError('productGone');
        if (p.stock != null && p.stock < (wanted.get(l.productId) || 0)) throw new AppError('outOfStock', p.name);
        await db.runAsync('INSERT INTO sale_items (sale_id, product_id, name, category, price, cost, qty, line_total) VALUES (?,?,?,?,?,?,?,?)',
          [saleId, p.id, p.name, p.category || 'Other', round2(l.price), p.cost, l.qty, lineTotal(l.price, l.qty)]);
      }
      for (const [pid, qty] of wanted) await db.runAsync('UPDATE products SET stock = stock - ? WHERE id = ? AND stock IS NOT NULL', [qty, pid]);
      if (input.customerId) await db.runAsync('UPDATE customers SET total_spent = total_spent + ?, visits = visits + 1, last_visit = ? WHERE id = ?', [totals.total, now, input.customerId]);
    });
    return (await Repo.getSale(saleId))!;
  },
  async getSale(id: number): Promise<Sale | null> { const r = await db.getFirstAsync<any>('SELECT * FROM sales WHERE id = ?', [id]); return r ? toSale(r) : null; },
  async getSaleItems(saleId: number): Promise<SaleItem[]> { return (await db.getAllAsync<any>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id', [saleId])).map(toItem); },
  async listSales(o: { from?: number; to?: number; status?: SaleStatus; staffId?: number | null } = {}): Promise<Sale[]> {
    const w: string[] = [], p: any[] = [];
    if (o.from != null) { w.push('created_at >= ?'); p.push(o.from); }
    if (o.to != null) { w.push('created_at <= ?'); p.push(o.to); }
    if (o.status) { w.push('status = ?'); p.push(o.status); }
    if (o.staffId != null) { w.push('staff_id = ?'); p.push(o.staffId); }
    return (await db.getAllAsync<any>(`SELECT * FROM sales ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY created_at DESC, id DESC`, p)).map(toSale);
  },
  /** Restocks tracked products and reverses the customer's stats. Only a completed sale can be refunded, once. */
  async refundSale(id: number, byStaffId: number | null): Promise<void> {
    await db.withTransactionAsync(async () => {
      const s = await db.getFirstAsync<any>('SELECT * FROM sales WHERE id = ?', [id]);
      if (!s) throw new AppError('notFound');
      if (s.status !== 'completed') throw new AppError('alreadyRefunded');
      for (const it of await db.getAllAsync<any>('SELECT * FROM sale_items WHERE sale_id = ?', [id]))
        if (it.product_id) await db.runAsync('UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL', [it.qty, it.product_id]);
      if (s.customer_id) await db.runAsync('UPDATE customers SET total_spent = MAX(0, total_spent - ?), visits = MAX(0, visits - 1) WHERE id = ?', [s.total, s.customer_id]);
      await db.runAsync("UPDATE sales SET status = 'refunded', refunded_at = ?, refunded_by = ? WHERE id = ?", [Date.now(), byStaffId, id]);
    });
  },

  // ---------------- Expenses ----------------
  async listExpenses(o: { from?: string; to?: string } = {}): Promise<Expense[]> {
    const w: string[] = [], p: any[] = [];
    if (o.from) { w.push('date >= ?'); p.push(o.from); }
    if (o.to) { w.push('date <= ?'); p.push(o.to); }
    return (await db.getAllAsync<any>(`SELECT * FROM expenses ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY date DESC, id DESC`, p)).map(toExpense);
  },
  async saveExpense(e: { category: string; amount: number; note?: string; date?: string; staffId?: number | null }): Promise<number> {
    const category = e.category.trim(), amount = round2(e.amount);
    if (!category || !(amount > 0)) throw new AppError('expenseInvalid');
    const r = await db.runAsync('INSERT INTO expenses (date, category, amount, note, staff_id, created_at) VALUES (?,?,?,?,?,?)', [e.date || ymd(new Date()), category, amount, (e.note || '').trim(), e.staffId ?? null, Date.now()]);
    return r.lastInsertRowId;
  },
  async deleteExpense(id: number) { await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]); },

  // ---------------- Reports (completed sales only; staffId limits to one cashier) ----------------
  async statsForRange(from: number, to: number, staffId?: number | null): Promise<{ revenue: number; count: number; discounts: number; tax: number; average: number }> {
    const r = await db.getFirstAsync<any>(
      `SELECT COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count, COALESCE(SUM(discount),0) AS discounts, COALESCE(SUM(tax),0) AS tax
         FROM sales WHERE status='completed' AND created_at BETWEEN ? AND ? ${staffId != null ? 'AND staff_id = ?' : ''}`, staffId != null ? [from, to, staffId] : [from, to]);
    const revenue = round2(r.revenue), count = r.count;
    return { revenue, count, discounts: round2(r.discounts), tax: round2(r.tax), average: count ? round2(revenue / count) : 0 };
  },
  async topProducts(from: number, to: number, limit = 6): Promise<{ name: string; qty: number; total: number }[]> {
    return (await db.getAllAsync<any>(
      `SELECT si.name AS name, SUM(si.qty) AS qty, SUM(si.line_total) AS total FROM sale_items si JOIN sales s ON s.id = si.sale_id
        WHERE s.status='completed' AND s.created_at BETWEEN ? AND ? GROUP BY si.name ORDER BY total DESC LIMIT ?`, [from, to, limit])).map((r) => ({ name: r.name, qty: r.qty, total: round2(r.total) }));
  },
  async categoryBreakdown(from: number, to: number): Promise<{ category: string; total: number }[]> {
    return (await db.getAllAsync<any>(
      `SELECT si.category AS category, SUM(si.line_total) AS total FROM sale_items si JOIN sales s ON s.id = si.sale_id
        WHERE s.status='completed' AND s.created_at BETWEEN ? AND ? GROUP BY si.category ORDER BY total DESC`, [from, to])).map((r) => ({ category: r.category, total: round2(r.total) }));
  },
  /** One entry per calendar day (oldest first), zero-filled. */
  async dailySeries(days: number, now: number = Date.now()): Promise<{ date: number; revenue: number; count: number }[]> {
    const start = daysAgoMs(days - 1, now);
    const rows = await db.getAllAsync<{ created_at: number; total: number }>("SELECT created_at, total FROM sales WHERE status='completed' AND created_at BETWEEN ? AND ?", [start, endOfDayMs(now)]);
    const out = Array.from({ length: days }, (_, i) => ({ date: daysAgoMs(days - 1 - i, now), revenue: 0, count: 0 }));
    for (const r of rows) {
      const d = startOfDayMs(r.created_at);
      const slot = out.find((o) => o.date === d); if (slot) { slot.revenue = round2(slot.revenue + r.total); slot.count++; }
    }
    return out;
  },
  async expensesTotal(fromMs: number, toMs: number): Promise<number> {
    const r = await db.getFirstAsync<{ t: number }>('SELECT COALESCE(SUM(amount),0) AS t FROM expenses WHERE date BETWEEN ? AND ?', [ymd(new Date(fromMs)), ymd(new Date(toMs))]);
    return round2(r?.t ?? 0);
  },

  // ---------------- Danger zone ----------------
  async wipeAll() {
    await db.withTransactionAsync(async () => { for (const t of [...BACKUP_TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`); });
  },
};
