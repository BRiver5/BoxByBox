import { useMemo } from "react";
import { useApp } from "../store/appStore";
import type { Box, Room } from "../data/repo";
import { estimate, type PaceEstimate } from "../lib/pace";
import { planPacking, type DayCap, type PackPlan, type RoomWork } from "../lib/packplan";
import { planNight, type NightPlan } from "../lib/firstnight";
import { addDays, daysBetween, weekdayLabel } from "../lib/time";

export type Overrides = { moveShift?: number; weekdayMin?: number; weekendMin?: number; helperDay?: number | null };

export type Move = {
  days: number;
  roomById: Map<string, Room>;
  paceOf: Record<string, PaceEstimate>;
  work: RoomWork[];
  remaining: Record<string, number>;
  caps: DayCap[];
  plan: PackPlan;
  night: NightPlan;
  dayName: (d: number) => string;
  isWeekend: (d: number) => boolean;
  boxTags: (b: Box) => string[];
  build: (o: Overrides) => { plan: PackPlan; days: number; caps: DayCap[] };
};

export function useMove(): Move {
  const version = useApp((s) => s.version);
  return useMemo(() => {
    const st = useApp.getState();
    const roomById = new Map(st.rooms.map((r) => [r.id, r]));
    const paceOf: Record<string, PaceEstimate> = Object.fromEntries(st.rooms.map((r) => [r.id, estimate(st.pace, r.kind)]));
    const boxTags = (b: Box): string[] => JSON.parse(b.tags);
    const dayName = (d: number) => (d === 0 ? "today" : d === 1 ? "tomorrow" : weekdayLabel(addDays(st.today, d)));
    const isWeekend = (d: number) => {
      const w = weekdayLabel(addDays(st.today, d));
      return w === "Sat" || w === "Sun";
    };
    // Осталось упаковать: оценка комнаты минус запечатанные, но не меньше открытых коробок.
    const remaining: Record<string, number> = {};
    for (const r of st.rooms) {
      const mine = st.boxes.filter((b) => b.room_id === r.id);
      const sealed = mine.filter((b) => b.status !== "open").length;
      const open = mine.filter((b) => b.status === "open").length;
      remaining[r.id] = Math.max(open, r.est_boxes - sealed);
    }
    const work: RoomWork[] = st.rooms.map((r) => ({ id: r.id, minutes: remaining[r.id] * paceOf[r.id].minutes, sd: Math.sqrt(remaining[r.id]) * paceOf[r.id].sd, window: r.window_days }));
    const build = (o: Overrides) => {
      const days = Math.max(0, daysBetween(st.today, addDays(st.settings.moveDay, o.moveShift ?? 0)));
      const caps: DayCap[] = Array.from({ length: days }, (_, d) => ({
        day: d,
        minutes: (isWeekend(d) ? o.weekendMin ?? st.settings.weekendMin : o.weekdayMin ?? st.settings.weekdayMin) + (st.extra[addDays(st.today, d)] ?? 0) + (o.helperDay === d ? 240 : 0),
      }));
      return { plan: planPacking(work, caps, days), days, caps };
    };
    const b = build({});
    const openable = st.boxes.filter((x) => x.status === "sealed").map((x) => ({ id: x.id, minutes: Math.max(5, Math.round((x.minutes ?? paceOf[x.room_id]?.minutes ?? 30) * 0.5)), tags: boxTags(x) }));
    const night = planNight(openable, st.wanted, st.settings.nightMin);
    return { days: b.days, roomById, paceOf, work, remaining, caps: b.caps, plan: b.plan, night, dayName, isWeekend, boxTags, build };
  }, [version]);
}

export function hm(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
