// Слой данных поверх expo-sqlite. Все функции — через один мьютекс (цепочка
// промисов), иначе параллельные транзакции expo-sqlite отклоняются.

import { getDb } from "../db/client";
import { generateId } from "../lib/id";
import { MODEL_VERSION, freshPace, observe, type Pace } from "../lib/pace";
import { addDays } from "../lib/time";

export type Room = { id: string; name: string; kind: string; est_boxes: number; window_days: number };
export type Box = { id: string; num: number; room_id: string; label: string; weight: "light" | "medium" | "heavy"; fragile: number; tags: string; status: "open" | "sealed" | "unpacked"; minutes: number | null; sealed_day: string | null; unpacked_day: string | null; created_day: string };
export type Settings = { moveDay: string; weekdayMin: number; weekendMin: number; nightMin: number; haptics: boolean };

export function defaultSettings(today: string): Settings {
  return { moveDay: addDays(today, 14), weekdayMin: 90, weekendMin: 240, nightMin: 90, haptics: true };
}

let chain: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

async function rebuild() {
  const db = await getDb();
  const rows = await db.getAllAsync<Box & { kind: string }>("SELECT boxes.*, rooms.kind AS kind FROM boxes JOIN rooms ON rooms.id = boxes.room_id WHERE minutes IS NOT NULL ORDER BY sealed_day ASC, boxes.rowid ASC;");
  let p = freshPace();
  for (const r of rows) p = observe(p, r.kind, r.minutes!);
  await db.runAsync("INSERT OR REPLACE INTO model (key, json) VALUES ('pace', ?);", [JSON.stringify(p)]);
}

export function loadAll(today: string) {
  return locked(async () => {
    const db = await getDb();
    const srows = await db.getAllAsync<{ key: string; value: string }>("SELECT * FROM settings;");
    const raw: Record<string, string> = Object.fromEntries(srows.map((r) => [r.key, r.value]));
    if (raw.model_version !== String(MODEL_VERSION)) {
      await rebuild();
      await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('model_version', ?);", [String(MODEL_VERSION)]);
    }
    const rooms = await db.getAllAsync<Room>("SELECT * FROM rooms ORDER BY rowid ASC;");
    const boxes = await db.getAllAsync<Box>("SELECT * FROM boxes ORDER BY num ASC;");
    const m = await db.getFirstAsync<{ json: string }>("SELECT json FROM model WHERE key = 'pace';");
    const pace: Pace = m ? JSON.parse(m.json) : freshPace();
    const settings = defaultSettings(today);
    if (raw.moveDay) settings.moveDay = raw.moveDay;
    for (const k of ["weekdayMin", "weekendMin", "nightMin"] as const) if (raw[k]) settings[k] = Number(raw[k]);
    if (raw.haptics) settings.haptics = raw.haptics === "1";
    const extra: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (k.startsWith("extra:")) extra[k.slice(6)] = Number(v);
    const wanted: string[] = raw.wanted ? JSON.parse(raw.wanted) : ["bed", "meds", "toiletries", "clothes", "chargers", "kettle"];
    return { rooms, boxes, pace, settings, extra, wanted, configured: !!raw.moveDay };
  });
}

export function addRoom(name: string, kind: string, est: number, windowDays: number) {
  return locked(async () => {
    const db = await getDb();
    const id = generateId();
    await db.runAsync("INSERT INTO rooms (id, name, kind, est_boxes, window_days) VALUES (?, ?, ?, ?, ?);", [id, name, kind, est, windowDays]);
    return id;
  });
}

export function updateRoom(id: string, patch: Partial<Omit<Room, "id">>) {
  return locked(async () => {
    const db = await getDb();
    for (const [k, v] of Object.entries(patch)) await db.runAsync(`UPDATE rooms SET ${k} = ? WHERE id = ?;`, [v as string | number, id]);
  });
}

export function deleteRoom(id: string) {
  return locked(async () => {
    const db = await getDb();
    const n = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM boxes WHERE room_id = ?;", [id]);
    if ((n?.n ?? 0) > 0) return false;
    await db.runAsync("DELETE FROM rooms WHERE id = ?;", [id]);
    return true;
  });
}

export type NewBox = { room_id: string; label: string; weight: Box["weight"]; fragile: boolean; tags: string[] };

export function addBox(b: NewBox, day: string) {
  return locked(async () => {
    const db = await getDb();
    const r = await db.getFirstAsync<{ n: number | null }>("SELECT MAX(num) AS n FROM boxes;");
    const num = (r?.n ?? 0) + 1;
    const id = generateId();
    await db.runAsync("INSERT INTO boxes (id, num, room_id, label, weight, fragile, tags, status, minutes, sealed_day, unpacked_day, created_day) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', NULL, NULL, NULL, ?);", [id, num, b.room_id, b.label, b.weight, b.fragile ? 1 : 0, JSON.stringify(b.tags), day]);
    return { id, num };
  });
}

export function updateBox(id: string, patch: Partial<Pick<Box, "label" | "weight" | "fragile" | "tags" | "room_id">>) {
  return locked(async () => {
    const db = await getDb();
    for (const [k, v] of Object.entries(patch)) await db.runAsync(`UPDATE boxes SET ${k} = ? WHERE id = ?;`, [v as string | number, id]);
  });
}

// Запечатать: минуты упаковки — наблюдение для модели темпа (на месте, без пересборки).
export function sealBox(id: string, minutes: number, day: string) {
  return locked(async () => {
    const db = await getDb();
    const b = await db.getFirstAsync<Box & { kind: string }>("SELECT boxes.*, rooms.kind AS kind FROM boxes JOIN rooms ON rooms.id = boxes.room_id WHERE boxes.id = ?;", [id]);
    if (!b) return;
    await db.runAsync("UPDATE boxes SET status = 'sealed', minutes = ?, sealed_day = ? WHERE id = ?;", [minutes, day, id]);
    if (b.minutes === null) {
      const m = await db.getFirstAsync<{ json: string }>("SELECT json FROM model WHERE key = 'pace';");
      const p = observe(m ? JSON.parse(m.json) : freshPace(), b.kind, minutes);
      await db.runAsync("INSERT OR REPLACE INTO model (key, json) VALUES ('pace', ?);", [JSON.stringify(p)]);
    } else await rebuild();
  });
}

export function setStatus(id: string, status: Box["status"], day: string) {
  return locked(async () => {
    const db = await getDb();
    if (status === "unpacked") await db.runAsync("UPDATE boxes SET status = 'unpacked', unpacked_day = ? WHERE id = ?;", [day, id]);
    else if (status === "open") {
      await db.runAsync("UPDATE boxes SET status = 'open', minutes = NULL, sealed_day = NULL, unpacked_day = NULL WHERE id = ?;", [id]);
      await rebuild();
    } else await db.runAsync("UPDATE boxes SET status = 'sealed', unpacked_day = NULL WHERE id = ?;", [id]);
  });
}

export function deleteBox(id: string) {
  return locked(async () => {
    const db = await getDb();
    await db.runAsync("DELETE FROM boxes WHERE id = ?;", [id]);
    await rebuild();
  });
}

export function saveSetting(key: string, value: string) {
  return locked(async () => {
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);", [key, value]);
  });
}

export function resetAll() {
  return locked(async () => {
    const db = await getDb();
    for (const t of ["rooms", "boxes", "model"]) await db.runAsync(`DELETE FROM ${t};`);
    await db.runAsync("DELETE FROM settings WHERE key LIKE 'extra:%' OR key = 'moveDay' OR key = 'wanted';");
  });
}
