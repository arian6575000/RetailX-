import assert from 'node:assert/strict';
import nacl from 'tweetnacl';
import { createNodeDb } from './nodeDb';
import { AppError, initRepo, Repo, getDb } from '../src/db/repo';
import { exportAll, importAll } from '../src/db/backupCore';
import { __setRandom } from '../src/lib/rand';
import { calcTotals, receiptNumber, round2 } from '../src/lib/calc';
import { receiptBody, receiptHtml } from '../src/lib/receipt';
import { roleCan } from '../src/lib/roles';
import { daysAgoMs, endOfDayMs, startOfDayMs } from '../src/lib/dates';

const throwsCode = async (p: Promise<any>, code: string, detail?: string) => {
  await assert.rejects(p, (e: any) => e instanceof AppError && e.code === code && (detail === undefined || e.detail === detail), `expected AppError ${code}`);
};
__setRandom(nacl.randomBytes);

(async () => {
  // ---------- pure maths ----------
  assert.equal(round2(1.005), 1.01); assert.equal(round2(0.1 + 0.2), 0.3); assert.equal(round2(-0.125), -0.13);
  assert.deepEqual(calcTotals([{ price: 10, qty: 3 }, { price: 2.5, qty: 2 }], 5, 10), { subtotal: 35, discount: 5, tax: 3, total: 33 });
  assert.equal(calcTotals([{ price: 10, qty: 1 }], 999, 10).total, 0);          // discount clamped to subtotal
  assert.equal(calcTotals([{ price: 10, qty: 1 }], -5, 0).total, 10);           // negative discount ignored
  assert.equal(calcTotals([{ price: 0.1, qty: 3 }], 0, 0).total, 0.3);          // no float drift
  assert.equal(receiptNumber(7, new Date(2026, 10, 8)), '261108-0007');
  assert.equal(roleCan('cashier', 'sell'), true); assert.equal(roleCan('cashier', 'sale.refund'), false);
  assert.equal(roleCan('cashier', 'backup'), false); assert.equal(roleCan('admin', 'backup'), true); assert.equal(roleCan(undefined, 'sell'), false);
  console.log('  ✓ maths + roles');

  const db = createNodeDb(); await initRepo(db); await initRepo(db);
  assert.equal((await db.getFirstAsync<any>('PRAGMA user_version'))?.user_version, 2);

  // ---------- staff ----------
  assert.equal(await Repo.anyStaffExists(), false);
  const admin = await Repo.createStaff({ name: 'Dilbar', role: 'admin', pin: '1234' });
  const cashier = await Repo.createStaff({ name: 'Ali', role: 'cashier', pin: '2222' });
  await throwsCode(Repo.createStaff({ name: 'X', role: 'cashier', pin: '1234' }), 'pinTaken');
  await throwsCode(Repo.createStaff({ name: 'X', role: 'cashier', pin: '12' }), 'pin4');
  await throwsCode(Repo.createStaff({ name: ' ', role: 'cashier', pin: '9999' }), 'nameRequired');
  assert.equal((await Repo.findStaffByPin('1234'))?.id, admin);
  assert.equal((await Repo.findStaffByPin('2222'))?.role, 'cashier');
  assert.equal(await Repo.findStaffByPin('0000'), null); assert.equal(await Repo.findStaffByPin('12'), null);
  assert.ok(await Repo.verifyStaffPin(admin, '1234')); assert.ok(!(await Repo.verifyStaffPin(admin, '2222')));
  const raw = await db.getFirstAsync<any>('SELECT * FROM staff WHERE id = ?', [admin]);
  assert.ok(raw.pin_hash.length === 128 && !raw.pin_hash.includes('1234') && raw.pin_salt.length === 32);  // salted + stretched, never plain
  await Repo.updateStaff(cashier, { pin: '3333' });
  assert.equal(await Repo.findStaffByPin('2222'), null); assert.equal((await Repo.findStaffByPin('3333'))?.id, cashier);
  await throwsCode(Repo.updateStaff(cashier, { pin: '1234' }), 'pinTaken');
  await throwsCode(Repo.updateStaff(admin, { role: 'cashier' }), 'lastAdmin');
  await throwsCode(Repo.updateStaff(admin, { active: false }), 'lastAdmin');
  await throwsCode(Repo.deleteStaff(admin), 'lastAdmin');
  await Repo.updateStaff(cashier, { active: false });
  assert.equal(await Repo.findStaffByPin('3333'), null);       // deactivated cashier cannot log in
  assert.equal(await Repo.countActiveStaff(), 1);
  await Repo.updateStaff(cashier, { active: true });
  console.log('  ✓ staff + PIN rules');

  // ---------- products ----------
  const cola = await Repo.saveProduct({ name: 'Cola', category: 'Beverages', price: 100, cost: 60, stock: 10, barcode: '111', unit: 'ea' });
  const rice = await Repo.saveProduct({ name: 'Rice', category: 'Grocery', price: 50.5, stock: 20.5, unit: 'kg', barcode: '222' });
  const svc = await Repo.saveProduct({ name: 'Gift wrap', category: 'Services', price: 20, stock: null });        // untracked
  await throwsCode(Repo.saveProduct({ name: 'Dup', price: 1, barcode: '111' }), 'barcodeExists');
  await Repo.saveProduct({ id: cola, name: 'Cola 330', price: 100, barcode: '111', stock: 10, cost: 60, category: 'Beverages' }); // own barcode ok
  await throwsCode(Repo.saveProduct({ name: '', price: 1 }), 'nameRequired');
  await throwsCode(Repo.saveProduct({ name: 'N', price: -1 }), 'invalidPrice');
  assert.equal((await Repo.findByBarcode('222'))?.name, 'Rice'); assert.equal(await Repo.findByBarcode('nope'), null); assert.equal(await Repo.findByBarcode(' '), null);
  assert.deepEqual(await Repo.categories(), ['Beverages', 'Grocery', 'Services']);
  console.log('  ✓ products');

  // ---------- sales ----------
  const cust = await Repo.saveCustomer({ name: 'Zara', phone: '0300' });
  await Repo.saveSettings({ ...(await Repo.getSettings()), taxRate: 10, lowStockThreshold: 5 });
  const s1 = await Repo.createSale({ lines: [{ productId: cola, qty: 2, price: 100 }, { productId: rice, qty: 1.5, price: 50.5 }, { productId: svc, qty: 1, price: 20 }], discount: 15, paymentMethod: 'cash', tendered: 400, customerId: cust, staffId: cashier });
  // subtotal = 200 + 75.75 + 20 = 295.75 ; discount 15 ; tax 10% of 280.75 = 28.08 (28.075 -> 28.08) ; total 308.83
  assert.deepEqual([s1.subtotal, s1.discount, s1.tax, s1.total, s1.number.endsWith('-0001'), s1.status], [295.75, 15, 28.08, 308.83, true, 'completed']);
  assert.equal((await Repo.getProduct(cola))!.stock, 8); assert.equal((await Repo.getProduct(rice))!.stock, 19); assert.equal((await Repo.getProduct(svc))!.stock, null);
  const items = await Repo.getSaleItems(s1.id);
  assert.equal(items.length, 3); assert.equal(items[1].lineTotal, 75.75); assert.equal(items[0].category, 'Beverages'); assert.equal(items[0].cost, 60);
  let c = (await Repo.getCustomer(cust))!; assert.deepEqual([c.totalSpent, c.visits], [308.83, 1]);
  assert.equal((await Repo.getSettings()).nextReceiptSeq, 2);
  const s2 = await Repo.createSale({ lines: [{ productId: cola, qty: 1, price: 100 }], discount: 0, paymentMethod: 'card', staffId: admin });
  assert.ok(s2.number.endsWith('-0002')); assert.equal(s2.tendered, null); assert.equal(s2.total, 110);
  console.log('  ✓ sale totals, stock, stats, receipt numbers');

  // validation + ATOMICITY: nothing may change when a sale fails half-way
  const before = async () => JSON.stringify([await Repo.getProduct(cola), await Repo.getProduct(rice), await Repo.getSettings(), (await getDb().getFirstAsync<any>('SELECT COUNT(*) n FROM sales')).n, (await getDb().getFirstAsync<any>('SELECT COUNT(*) n FROM sale_items')).n, await Repo.getCustomer(cust)]);
  const snap = await before();
  await throwsCode(Repo.createSale({ lines: [{ productId: rice, qty: 1, price: 50 }, { productId: cola, qty: 99, price: 100 }], discount: 0, paymentMethod: 'card' }), 'outOfStock', 'Cola 330');
  await throwsCode(Repo.createSale({ lines: [{ productId: cola, qty: 5, price: 100 }, { productId: cola, qty: 5, price: 100 }], discount: 0, paymentMethod: 'card' }), 'outOfStock'); // combined qty 10 > 7
  await throwsCode(Repo.createSale({ lines: [{ productId: cola, qty: 1, price: 100 }], discount: 0, paymentMethod: 'cash', tendered: 50 }), 'underpaid');
  await throwsCode(Repo.createSale({ lines: [{ productId: 9999, qty: 1, price: 1 }], discount: 0, paymentMethod: 'card' }), 'productGone');
  await throwsCode(Repo.createSale({ lines: [], discount: 0, paymentMethod: 'card' }), 'cartEmpty');
  await throwsCode(Repo.createSale({ lines: [{ productId: cola, qty: 0, price: 1 }], discount: 0, paymentMethod: 'card' }), 'invalidLine');
  await throwsCode(Repo.createSale({ lines: [{ productId: cola, qty: 1, price: 1 }], discount: 0, paymentMethod: 'bitcoin' as any }), 'invalidPayment');
  assert.equal(await before(), snap);
  console.log('  ✓ validation + atomic rollback');

  // ---------- refund ----------
  await Repo.refundSale(s1.id, admin);
  assert.equal((await Repo.getProduct(cola))!.stock, 8 - 1 + 2);        // s2 sold 1 (stock 7) + refund restock 2 = 9
  assert.equal((await Repo.getProduct(rice))!.stock, 20.5);
  c = (await Repo.getCustomer(cust))!; assert.deepEqual([c.totalSpent, c.visits], [0, 0]);
  assert.equal((await Repo.getSale(s1.id))!.status, 'refunded');
  await throwsCode(Repo.refundSale(s1.id, admin), 'alreadyRefunded');   // cannot restock twice
  await throwsCode(Repo.refundSale(424242, admin), 'notFound');
  console.log('  ✓ refund');

  // deleting a product / staff keeps history readable
  const p3 = await Repo.saveProduct({ name: 'Temp', category: 'Tmp', price: 5, stock: 3 });
  const s3 = await Repo.createSale({ lines: [{ productId: p3, qty: 1, price: 5 }], discount: 0, paymentMethod: 'card', staffId: cashier });
  await Repo.deleteProduct(p3);
  const it3 = (await Repo.getSaleItems(s3.id))[0]; assert.equal(it3.name, 'Temp'); assert.equal(it3.productId, null); assert.equal(it3.category, 'Tmp');
  assert.equal((await Repo.categoryBreakdown(0, Date.now() + 1000)).find((x) => x.category === 'Tmp')?.total, 5);   // category survives deletion
  console.log('  ✓ history survives deletes');

  // ---------- reports ----------
  const now = Date.now();
  const st = await Repo.statsForRange(startOfDayMs(now), endOfDayMs(now));
  assert.deepEqual([st.count, st.revenue], [2, 115.5]);                  // s2 (110) + s3 (5.5); refunded s1 excluded
  assert.equal((await Repo.statsForRange(startOfDayMs(now), endOfDayMs(now), cashier)).count, 1);
  assert.equal((await Repo.statsForRange(startOfDayMs(now), endOfDayMs(now), 12345)).count, 0);
  const top = await Repo.topProducts(0, now + 1000, 5); assert.equal(top[0].name, 'Cola 330'); assert.equal(top[0].total, 100);
  const series = await Repo.dailySeries(7); assert.equal(series.length, 7); assert.equal(series[6].count, 2); assert.equal(series[0].revenue, 0);
  // old sale lands in the right bucket (3 days ago)
  await db.runAsync('UPDATE sales SET created_at = ? WHERE id = ?', [daysAgoMs(3) + 3600000, s3.id]);
  const series2 = await Repo.dailySeries(7); assert.equal(series2[3].count, 1); assert.equal(series2[6].count, 1);
  await Repo.saveExpense({ category: 'Rent', amount: 40.25, note: 'x' }); await Repo.saveExpense({ category: 'Tea', amount: 10 });
  await throwsCode(Repo.saveExpense({ category: '', amount: 5 }), 'expenseInvalid'); await throwsCode(Repo.saveExpense({ category: 'a', amount: 0 }), 'expenseInvalid');
  assert.equal(await Repo.expensesTotal(startOfDayMs(now), endOfDayMs(now)), 50.25);
  assert.equal((await Repo.listExpenses()).length, 2);
  assert.deepEqual((await Repo.lowStockProducts()).map((p) => p.name), []);
  await Repo.saveProduct({ id: rice, name: 'Rice', category: 'Grocery', price: 50.5, stock: 2, unit: 'kg', barcode: '222' });
  assert.deepEqual((await Repo.lowStockProducts()).map((p) => p.name), ['Rice']);
  console.log('  ✓ reports');

  // ---------- receipt ----------
  const settings = await Repo.getSettings();
  const html = receiptHtml({ settings: { ...settings, businessName: '<b>Shop & Co</b>' }, sale: s2, items: await Repo.getSaleItems(s2.id), cashier: 'Dilbar' });
  assert.ok(html.includes('&lt;b&gt;Shop &amp; Co&lt;/b&gt;') && !html.includes('<b>Shop')); assert.ok(html.includes('RetailX Solution · 03286575000')); assert.ok(html.includes('#' + s2.number));
  const refunded = receiptBody({ settings, sale: (await Repo.getSale(s1.id))!, items: await Repo.getSaleItems(s1.id) }); assert.ok(refunded.includes('REFUNDED')); assert.ok(refunded.includes('Change'));
  console.log('  ✓ receipt');

  // ---------- backup round trip keeps everything (incl. staff PIN hashes) ----------
  const b = await exportAll(); assert.equal(Object.keys(b.tables).length, 7);
  await Repo.wipeAll();
  assert.equal(await Repo.anyStaffExists(), false); assert.equal((await Repo.listProducts()).length, 0);
  await importAll(JSON.parse(JSON.stringify(b)));
  assert.equal((await Repo.findStaffByPin('1234'))?.name, 'Dilbar');
  assert.equal((await Repo.listProducts()).length, 3); assert.equal((await Repo.listSales()).length, 3);
  assert.equal((await Repo.getSale(s2.id))!.number, s2.number);
  const s4 = await Repo.createSale({ lines: [{ productId: cola, qty: 1, price: 100 }], discount: 0, paymentMethod: 'card' });   // sequences/ids continue after restore
  assert.ok(s4.id > s3.id && s4.number.endsWith('-0004'));
  console.log('  ✓ backup/restore + wipe');

  // ---------- demo catalogue ----------
  const { DEMO_PRODUCTS } = await import('../src/data/demoProducts');
  await Repo.addProducts(DEMO_PRODUCTS); assert.equal((await Repo.listProducts()).length, 103);
  console.log('repo tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
