// SQLite runner (migrations tracked with PRAGMA user_version). The SQL itself lives in migrations.ts.
// Anything that talks to SQLite goes through the small `Db` interface so the
// same code can run on expo-sqlite (app) and node:sqlite (tests).

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export async function migrate(db: Db, migrations: string[]): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;
  while (v < migrations.length) {
    const sql = migrations[v];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${v + 1};`);
    });
    v++;
  }
}
