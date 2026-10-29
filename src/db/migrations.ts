import type { SQLiteDatabase } from "expo-sqlite";

// Каждая миграция — одна ступень схемы. Не редактируй уже выпущенную миграцию —
// добавляй новую в конец массива. PRAGMA user_version хранит номер последней
// применённой ступени, миграции применяются последовательно от текущего значения.
const migrations: string[] = [
  `
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    est_boxes INTEGER NOT NULL,
    window_days INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS boxes (
    id TEXT PRIMARY KEY NOT NULL,
    num INTEGER NOT NULL,
    room_id TEXT NOT NULL,
    label TEXT NOT NULL,
    weight TEXT NOT NULL,
    fragile INTEGER NOT NULL,
    tags TEXT NOT NULL,
    status TEXT NOT NULL,
    minutes INTEGER,
    sealed_day TEXT,
    unpacked_day TEXT,
    created_day TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS model (
    key TEXT PRIMARY KEY NOT NULL,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const currentVersion = row?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await db.execAsync(migrations[i]);
    await db.execAsync(`PRAGMA user_version = ${i + 1};`);
  }
}
