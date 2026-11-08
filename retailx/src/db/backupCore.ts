// Generic backup / restore: dumps every table in BACKUP_TABLES as JSON rows. Works for any app built on this template,
// nothing to change when you add tables (just list them in tables.ts).
import { getDb } from './repo';
import { BACKUP_TABLES } from './tables';
import { APP, CREDIT } from '../lib/brand';

export const BACKUP_VERSION = 1;
export type BackupPayload = { app: string; by: string; version: number; exportedAt: string; tables: Record<string, any[]> };

export async function exportAll(): Promise<BackupPayload> {
  const db = getDb();
  const tables: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) tables[t] = await db.getAllAsync<any>(`SELECT * FROM ${t} ORDER BY rowid`);
  return { app: APP.slug, by: CREDIT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables };
}

/** Throws Error('invalidBackup') for anything that is not a backup of THIS app. */
export function validateBackup(p: any): asserts p is BackupPayload {
  if (!p || typeof p !== 'object' || p.app !== APP.slug || typeof p.tables !== 'object' || !p.tables) throw new Error('invalidBackup');
  if (typeof p.version !== 'number' || p.version > BACKUP_VERSION) throw new Error('invalidBackup');
  for (const [name, rows] of Object.entries(p.tables)) {
    if (!BACKUP_TABLES.includes(name) || !Array.isArray(rows)) throw new Error('invalidBackup');
    for (const r of rows as any[]) if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('invalidBackup');
  }
}

/** Row counts per table, for the confirmation sheet. */
export const backupCounts = (p: BackupPayload) => Object.fromEntries(Object.entries(p.tables).map(([k, v]) => [k, v.length]));

/** Replaces ALL data with the backup, atomically (all-or-nothing). Unknown columns in the file are ignored. */
export async function importAll(p: unknown): Promise<void> {
  validateBackup(p);
  const db = getDb();
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const t of [...BACKUP_TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`);
      for (const t of BACKUP_TABLES) {
        const rows = (p.tables[t] || []) as Record<string, any>[];
        if (!rows.length) continue;
        const cols = (await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name);
        for (const r of rows) {
          const use = cols.filter((c) => c in r);
          if (!use.length) continue;
          await db.runAsync(`INSERT INTO ${t} (${use.join(',')}) VALUES (${use.map(() => '?').join(',')})`, use.map((c) => (r[c] === undefined ? null : r[c])));
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
