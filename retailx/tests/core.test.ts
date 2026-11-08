import assert from 'node:assert/strict';
import { createNodeDb } from './nodeDb';
import { initRepo, Repo, getDb } from '../src/db/repo';
import { exportAll, importAll, validateBackup } from '../src/db/backupCore';
import nacl from 'tweetnacl';
import { encryptBackup, decryptBackup, isEncryptedBackup } from '../src/lib/backupCrypto';
import { __setRandom } from '../src/lib/rand';
import { newSalt, same, stretch } from '../src/lib/pinHash';
import { Fmt } from '../src/lib/format';
import { APP } from '../src/lib/brand';
import { MIGRATIONS } from '../src/db/migrations';
import { DEFAULT_SETTINGS } from '../src/db/types';
import { pageHtml, escapeHtml } from '../src/lib/pageHtml';
import { toCsv } from '../src/lib/csv';

__setRandom(nacl.randomBytes);
(async () => {
  const db = createNodeDb();
  await initRepo(db);
  await initRepo(db); // migrations are idempotent
  assert.equal((await db.getFirstAsync<any>('PRAGMA user_version'))?.user_version, MIGRATIONS.length);

  // settings
  const s = await Repo.getSettings();
  assert.equal(s.businessName, DEFAULT_SETTINGS.businessName);
  await Repo.saveSettings({ ...s, businessName: 'Test Co', phone: '0300' });
  assert.equal((await Repo.getSettings()).businessName, 'Test Co');
  console.log('  ✓ settings');

  // backup round trip
  const b1 = await exportAll();
  assert.equal(b1.app, APP.slug);
  await Repo.saveSettings({ ...(await Repo.getSettings()), businessName: 'Changed' });
  await importAll(JSON.parse(JSON.stringify(b1)));
  assert.equal((await Repo.getSettings()).businessName, 'Test Co');
  console.log('  ✓ backup export/import');

  // validation: other app / wrong shape / unknown table / future version
  assert.throws(() => validateBackup({ ...b1, app: 'other' }), /invalidBackup/);
  assert.throws(() => validateBackup({ ...b1, tables: { evil: [] } }), /invalidBackup/);
  assert.throws(() => validateBackup({ ...b1, tables: { settings: 'x' } }), /invalidBackup/);
  assert.throws(() => validateBackup({ ...b1, version: 99 }), /invalidBackup/);
  assert.throws(() => validateBackup(null), /invalidBackup/);
  // atomic: a bad row must roll the whole restore back and leave data intact
  await assert.rejects(importAll({ ...b1, tables: { settings: [{ id: null, data: null }] } }));
  assert.equal((await Repo.getSettings()).businessName, 'Test Co');
  // injection via column names is impossible: unknown columns are ignored
  await importAll({ ...b1, tables: { settings: [{ id: 'main', data: JSON.stringify({ businessName: 'X' }), 'x); DROP TABLE settings;--': 1 }] } });
  assert.equal((await Repo.getSettings()).businessName, 'X');
  console.log('  ✓ backup validation + atomic rollback');

  // encrypted backup
  const enc = encryptBackup(JSON.stringify(b1), 'secret1');
  assert.ok(isEncryptedBackup(JSON.parse(enc)));
  assert.equal(JSON.stringify(decryptBackup(JSON.parse(enc), 'secret1').tables), JSON.stringify(b1.tables));
  assert.throws(() => decryptBackup(JSON.parse(enc), 'wrong'), /wrongBackupPassword/);
  console.log('  ✓ encrypted backup');

  // pin hashing
  const salt = newSalt();
  assert.equal(salt.length, 32);
  assert.ok(same(stretch('1234', salt), stretch('1234', salt)));
  assert.ok(!same(stretch('1234', salt), stretch('1235', salt)));
  assert.ok(!same(stretch('1234', salt), stretch('1234', newSalt())));
  console.log('  ✓ pin hashing');

  // print/export: credit is always present, HTML is escaped, CSV cannot inject formulas
  assert.ok(pageHtml('<p>x</p>').includes('RetailX Solution · 03286575000'));
  assert.ok(pageHtml('<p>x</p>', 0).includes('RetailX Solution'));
  assert.equal(escapeHtml('<b>"A&B"</b>'), '&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
  const csv = toCsv(['a', 'b'], [['=1+1', 'x,y'], ['-5', 'q"r']]);
  assert.ok(csv.includes("'=1+1") && csv.includes('"x,y"') && csv.includes('-5') && csv.includes('"q""r"'));
  assert.ok(csv.trimEnd().endsWith('03286575000'));
  console.log('  ✓ print/csv credit + escaping');

  // wipe
  await Repo.wipeAll();
  assert.equal((await getDb().getAllAsync('SELECT * FROM settings')).length, 0);
  console.log('  ✓ wipeAll');

  // money format
  Fmt.currency = 'Rs';
  assert.equal(Fmt.money(1234567), 'Rs 1,234,567');
  assert.equal(Fmt.money(12.5), 'Rs 12.50');
  assert.equal(Fmt.money(-0.1 - 0.2), '-Rs 0.30');
  assert.equal(Fmt.money(null), 'Rs 0');
  console.log('core tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
