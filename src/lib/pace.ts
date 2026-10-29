// Накапливаемая модель темпа упаковки: сколько минут уходит на коробку в
// комнате данного вида. Каждая запечатанная коробка с отметкой «заняло N
// минут» — одно наблюдение (логарифм минут, суммы с забыванием). Вид комнаты
// стягивается к общему темпу, общий — к априору 30 минут.

export const MODEL_VERSION = 1;
export const FORGET = 0.92;

export type Stat = { w: number; s: number; ss: number }; // по log(минут)
export type Pace = { all: Stat; kinds: Record<string, Stat> };

export function freshPace(): Pace {
  return { all: { w: 0, s: 0, ss: 0 }, kinds: {} };
}

function add(x: Stat | undefined, v: number): Stat {
  const o = x ?? { w: 0, s: 0, ss: 0 };
  return { w: o.w * FORGET + 1, s: o.s * FORGET + v, ss: o.ss * FORGET + v * v };
}

export function observe(p: Pace, kind: string, minutes: number): Pace {
  const v = Math.log(Math.max(1, minutes));
  return { all: add(p.all, v), kinds: { ...p.kinds, [kind]: add(p.kinds[kind], v) } };
}

const PRIOR_LOG = Math.log(30);
const PRIOR_SD = 0.5;
const K_ALL = 3;
const K_KIND = 3;
// Вид комнаты по умолчанию тяжелее/легче среднего (кухня — посуда, кладовка — быстро).
export const KIND_BIAS: Record<string, number> = { kitchen: 1.35, bath: 0.9, bedroom: 1, living: 1, office: 1.1, kids: 1.15, storage: 0.75 };

export type PaceEstimate = { minutes: number; sd: number; n: number; overall: number };

// Ожидаемые минуты на коробку и разброс одной коробки (лог-нормаль).
export function estimate(p: Pace, kind: string): PaceEstimate {
  const a = p.all;
  const allMean = (K_ALL * PRIOR_LOG + a.s) / (K_ALL + a.w);
  const k = p.kinds[kind] ?? { w: 0, s: 0, ss: 0 };
  const prior = allMean + Math.log(KIND_BIAS[kind] ?? 1);
  const mean = (K_KIND * prior + k.s) / (K_KIND + k.w);
  const varK = k.w > 1 ? Math.max(0.02, k.ss / k.w - (k.s / k.w) ** 2) : PRIOR_SD ** 2;
  const v = (K_KIND * PRIOR_SD ** 2 + k.w * varK) / (K_KIND + k.w);
  const m = Math.exp(mean + v / 2);
  const sd = m * Math.sqrt(Math.exp(v) - 1);
  return { minutes: m, sd, n: k.w, overall: Math.exp(allMean) };
}
