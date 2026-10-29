// Первая ночь на новом месте: какие коробки вскрыть первыми, чтобы за лимит
// времени закрыть как можно больше самого нужного. Задача о максимальном
// взвешенном покрытии с бюджетом — точный перебор с отсечением: граница =
// текущее покрытие + веса ещё не закрытых категорий, которые есть в оставшихся
// коробках. Коробки без «первой ночи» в перебор не попадают.

export const ESSENTIALS: { key: string; label: string; weight: number }[] = [
  { key: "bed", label: "Bed linen", weight: 5 },
  { key: "meds", label: "Medicine", weight: 5 },
  { key: "toiletries", label: "Toiletries", weight: 4 },
  { key: "kids", label: "Kids' things", weight: 4 },
  { key: "pet", label: "Pet supplies", weight: 4 },
  { key: "clothes", label: "Tomorrow's clothes", weight: 3 },
  { key: "chargers", label: "Chargers", weight: 3 },
  { key: "kettle", label: "Kettle & mugs", weight: 2 },
  { key: "tools", label: "Basic tools", weight: 1 },
  { key: "cleaning", label: "Cleaning kit", weight: 1 },
];
export const WEIGHT: Record<string, number> = Object.fromEntries(ESSENTIALS.map((e) => [e.key, e.weight]));

export type Openable = { id: string; minutes: number; tags: string[] };
export type NightPlan = { open: string[]; covered: string[]; missing: string[]; score: number; max: number; minutes: number; exact: boolean };

export function planNight(boxes: Openable[], wanted: string[], budget: number): NightPlan {
  const want = new Set(wanted);
  const cand = boxes.filter((b) => b.tags.some((t) => want.has(t))).sort((a, b) => gain(b) / b.minutes - gain(a) / a.minutes);
  function gain(b: Openable) {
    return b.tags.filter((t) => want.has(t)).reduce((s, t) => s + (WEIGHT[t] ?? 1), 0);
  }
  const max = [...want].reduce((s, t) => s + (WEIGHT[t] ?? 1), 0);
  let best = -1;
  let bestSet: number[] = [];
  let bestMin = Infinity;
  const pick: number[] = [];
  const have = new Map<string, number>();
  let nodes = 0;
  let exact = true;
  const dfs = (i: number, used: number, score: number) => {
    if (++nodes > 300_000) {
      exact = false;
      return;
    }
    if (score > best || (score === best && used < bestMin)) {
      best = score;
      bestSet = [...pick];
      bestMin = used;
    }
    if (i === cand.length) return;
    // Граница: всё нужное, что ещё не закрыто и встречается в оставшихся коробках.
    let bound = score;
    const seen = new Set<string>();
    for (let j = i; j < cand.length; j++) for (const t of cand[j].tags) if (want.has(t) && !have.get(t) && !seen.has(t)) {
      seen.add(t);
      bound += WEIGHT[t] ?? 1;
    }
    if (bound < best || (bound === best && used >= bestMin)) return;
    const b = cand[i];
    if (used + b.minutes <= budget) {
      let add = 0;
      for (const t of b.tags) if (want.has(t)) {
        if (!have.get(t)) add += WEIGHT[t] ?? 1;
        have.set(t, (have.get(t) ?? 0) + 1);
      }
      pick.push(i);
      dfs(i + 1, used + b.minutes, score + add);
      pick.pop();
      for (const t of b.tags) if (want.has(t)) have.set(t, (have.get(t) ?? 0) - 1);
    }
    dfs(i + 1, used, score);
  };
  dfs(0, 0, 0);
  const open = bestSet.map((i) => cand[i].id);
  const covered = [...new Set(bestSet.flatMap((i) => cand[i].tags.filter((t) => want.has(t))))];
  return { open, covered, missing: [...want].filter((t) => !covered.includes(t)), score: Math.max(0, best), max, minutes: bestMin === Infinity ? 0 : bestMin, exact };
}
