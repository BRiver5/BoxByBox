import { test } from "node:test";
import assert from "node:assert/strict";
import { estimate, freshPace, observe } from "./pace.ts";
import { planPacking, remedies, type RoomWork } from "./packplan.ts";
import { planNight } from "./firstnight.ts";

test("pace learns per room kind and shrinks unseen kinds to the overall pace", () => {
  let p = freshPace();
  const k0 = estimate(p, "kitchen").minutes;
  for (let i = 0; i < 6; i++) p = observe(p, "kitchen", 55);
  assert.ok(estimate(p, "kitchen").minutes > k0);
  for (let i = 0; i < 6; i++) p = observe(p, "storage", 10);
  assert.ok(estimate(p, "storage").minutes < estimate(p, "kitchen").minutes);
  assert.ok(estimate(p, "bedroom").n === 0);
});

// Эталон: перебор целых «порций» по 30 минут на дни, минимизируя (опоздание, затем неудобство).
function brute(rooms: RoomWork[], caps: number[], days: number): [number, number] {
  const units = rooms.flatMap((r) => Array(Math.round(r.minutes / 30)).fill(r));
  let best: [number, number] = [Infinity, Infinity];
  const free = [...caps];
  const rec = (i: number, early: number, late: number) => {
    if (late > best[0] || (late === best[0] && early >= best[1])) return;
    if (i === units.length) {
      best = [late, early];
      return;
    }
    const r = units[i];
    for (let d = 0; d < days; d++) {
      if (free[d] < 30) continue;
      free[d] -= 30;
      rec(i + 1, early + (days - d > r.window ? 30 : 0), late);
      free[d] += 30;
    }
    rec(i + 1, early, late + 30);
  };
  rec(0, 0, 0);
  return best;
}

test("backward greedy packing is optimal on nested windows", () => {
  const cases: { rooms: RoomWork[]; caps: number[] }[] = [
    { rooms: [{ id: "k", minutes: 90, sd: 10, window: 1 }, { id: "s", minutes: 60, sd: 10, window: 4 }, { id: "b", minutes: 60, sd: 10, window: 2 }], caps: [60, 60, 60, 60] },
    { rooms: [{ id: "k", minutes: 120, sd: 10, window: 1 }, { id: "s", minutes: 30, sd: 10, window: 3 }], caps: [30, 30, 60] },
    { rooms: [{ id: "a", minutes: 60, sd: 10, window: 2 }, { id: "b", minutes: 90, sd: 10, window: 2 }, { id: "c", minutes: 30, sd: 10, window: 1 }], caps: [30, 60, 30, 30] },
  ];
  for (const c of cases) {
    const days = c.caps.length;
    const p = planPacking(c.rooms, c.caps.map((m, d) => ({ day: d, minutes: m })), days);
    const [late, early] = brute(c.rooms, c.caps, days);
    assert.equal(p.late, late);
    assert.equal(p.early, early);
  }
});

test("remedies are verified and actually help", () => {
  const rooms = [{ id: "k", minutes: 300, sd: 40, window: 1 }, { id: "s", minutes: 200, sd: 30, window: 5 }];
  const caps = [0, 1, 2, 3, 4].map((d) => ({ day: d, minutes: 60 }));
  const p = planPacking(rooms, caps, 5);
  assert.ok(p.late > 0 && p.pOnTime < 0.5);
  const r = remedies(rooms, caps, 5, p, (d) => `d${d}`, (d) => d === 2);
  assert.ok(r.length >= 2);
  for (const x of r) assert.ok(x.plan.late < p.late || x.plan.pOnTime > p.pOnTime);
});

// Эталон: все подмножества коробок.
test("first-night plan is the best coverage within the time budget", () => {
  const boxes = [
    { id: "1", minutes: 20, tags: ["bed", "clothes"] },
    { id: "2", minutes: 15, tags: ["toiletries", "meds"] },
    { id: "3", minutes: 30, tags: ["kettle", "chargers", "bed"] },
    { id: "4", minutes: 10, tags: ["chargers"] },
    { id: "5", minutes: 25, tags: ["kids", "tools"] },
  ];
  const want = ["bed", "clothes", "toiletries", "meds", "kettle", "chargers", "kids", "tools"];
  const W: Record<string, number> = { bed: 5, meds: 5, toiletries: 4, kids: 4, clothes: 3, chargers: 3, kettle: 2, tools: 1 };
  for (const budget of [0, 20, 45, 60, 100]) {
    let best = 0;
    for (let m = 0; m < 32; m++) {
      const pick = boxes.filter((_, i) => m & (1 << i));
      if (pick.reduce((s, b) => s + b.minutes, 0) > budget) continue;
      const cov = new Set(pick.flatMap((b) => b.tags));
      best = Math.max(best, [...cov].reduce((s, t) => s + W[t], 0));
    }
    const p = planNight(boxes, want, budget);
    assert.equal(p.score, best, `budget ${budget}`);
    assert.ok(p.minutes <= budget);
  }
});
