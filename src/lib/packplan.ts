// Какую комнату в какой день паковать. У каждой комнаты есть «окно без
// неудобств»: последние N дней перед переездом (кухней и ванной пользуешься до
// конца — окно 1–2 дня, кладовкой можно не пользоваться две недели). Паковать
// раньше окна можно, но каждая такая минута — неудобство. Все окна — суффиксы
// одной временной шкалы, т.е. вложены друг в друга, поэтому жадная раскладка
// с конца (в последние дни — комнаты с самым коротким окном) оптимальна:
// неудобство минимально, а всё, что не влезло в дни до переезда, — честное
// опоздание. Оптимальность проверена в тестах полным перебором.

import { phi } from "./stats.ts";

export type RoomWork = { id: string; minutes: number; sd: number; window: number };
export type DayCap = { day: number; minutes: number }; // day: 0 = сегодня, последний — накануне переезда
export type Chunk = { room: string; day: number; minutes: number; early: boolean };
export type PackPlan = { chunks: Chunk[]; early: number; late: number; lateByRoom: Record<string, number>; total: number; capacity: number; pOnTime: number; sd: number };

// days — число дней до переезда (последний рабочий день = days − 1).
export function planPacking(rooms: RoomWork[], caps: DayCap[], days: number): PackPlan {
  const left = Object.fromEntries(rooms.map((r) => [r.id, r.minutes]));
  const free = caps.map((c) => c.minutes);
  const chunks: Chunk[] = [];
  const byWindow = [...rooms].sort((a, b) => a.window - b.window || a.id.localeCompare(b.id));
  // Проход 1: каждая комната — внутри своего окна, начиная с самых поздних дней.
  for (let d = days - 1; d >= 0; d--) {
    const daysBefore = days - d; // 1 = накануне
    for (const r of byWindow) {
      if (daysBefore > r.window || left[r.id] <= 0 || free[d] <= 0) continue;
      const m = Math.min(left[r.id], free[d]);
      chunks.push({ room: r.id, day: d, minutes: m, early: false });
      left[r.id] -= m;
      free[d] -= m;
    }
  }
  // Проход 2: остаток — в самые поздние свободные дни до окна (раньше окна, с неудобством).
  // Длинным окнам — первыми: им «раньше окна» дешевле всего по смыслу (кладовка, не кухня).
  for (const r of [...byWindow].reverse()) {
    for (let d = days - 1; d >= 0 && left[r.id] > 0; d--) {
      if (free[d] <= 0) continue;
      const m = Math.min(left[r.id], free[d]);
      chunks.push({ room: r.id, day: d, minutes: m, early: true });
      left[r.id] -= m;
      free[d] -= m;
    }
  }
  const lateByRoom = Object.fromEntries(rooms.filter((r) => left[r.id] > 1e-9).map((r) => [r.id, left[r.id]]));
  const total = rooms.reduce((s, r) => s + r.minutes, 0);
  const capacity = caps.reduce((s, c) => s + c.minutes, 0);
  const sd = Math.sqrt(rooms.reduce((s, r) => s + r.sd * r.sd, 0));
  const pOnTime = sd > 0 ? phi((capacity - total) / sd) : total <= capacity ? 1 : 0;
  chunks.sort((a, b) => a.day - b.day || a.room.localeCompare(b.room));
  return {
    chunks,
    early: chunks.filter((c) => c.early).reduce((s, c) => s + c.minutes, 0),
    late: Object.values(lateByRoom).reduce((s, x) => s + x, 0),
    lateByRoom,
    total,
    capacity,
    pOnTime,
    sd,
  };
}

// Что поможет успеть — каждое предложение проверено пересчётом плана.
export type Remedy = { label: string; detail: string; plan: PackPlan; extra: { day: number; minutes: number }[] };

export function remedies(rooms: RoomWork[], caps: DayCap[], days: number, base: PackPlan, dayName: (d: number) => string, weekend: (d: number) => boolean): Remedy[] {
  if (base.late <= 0 && base.pOnTime >= 0.8) return [];
  const out: Remedy[] = [];
  const need = Math.max(base.late, 0);
  // Час в день ко всем будним дням.
  const hour = caps.map((c) => ({ ...c, minutes: c.minutes + 60 }));
  out.push({ label: "One more hour every day", detail: `${caps.length} extra hours before the move.`, plan: planPacking(rooms, hour, days), extra: caps.map((c) => ({ day: c.day, minutes: 60 })) });
  // Помощник на ближайший выходной: +4 часа.
  const wk = caps.find((c) => weekend(c.day));
  if (wk) {
    const h = caps.map((c) => (c.day === wk.day ? { ...c, minutes: c.minutes + 240 } : c));
    out.push({ label: `A helper on ${dayName(wk.day)}`, detail: "Four extra hours from a friend on the weekend.", plan: planPacking(rooms, h, days), extra: [{ day: wk.day, minutes: 240 }] });
  }
  // Минимальная добавка в последний день, закрывающая опоздание целиком.
  if (need > 0 && caps.length) {
    const last = caps[caps.length - 1];
    const h = caps.map((c) => (c.day === last.day ? { ...c, minutes: c.minutes + Math.ceil(need / 30) * 30 } : c));
    out.push({ label: `A long last evening (+${Math.ceil(need / 30) * 30} min)`, detail: `Everything left gets done on ${dayName(last.day)}.`, plan: planPacking(rooms, h, days), extra: [{ day: last.day, minutes: Math.ceil(need / 30) * 30 }] });
  }
  return out.filter((r) => r.plan.late < base.late || r.plan.pOnTime > base.pOnTime + 0.05).sort((a, b) => a.plan.late - b.plan.late || b.plan.pOnTime - a.plan.pOnTime || a.plan.early - b.plan.early);
}
