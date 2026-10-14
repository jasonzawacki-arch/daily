// Gut tracking: what goes in (meals with food tags, fiber, water) against what comes out (timed symptoms with
// severity, Bristol scale). Pure functions here; the screens are in protocol.ts.
//
// The analysis is deliberately cautious. A few weeks of data produce coincidences, so it reports counts
// ("6 of 9 meals"), compares against the user's own baseline, flags a pattern only past a minimum sample, and never
// says a food causes a symptom. An elimination plan is the way to test a pattern.

export const GUT_SY = ['Bloating', 'Discomfort', 'Gas', 'Cramping', 'Reflux', 'Nausea', 'Urgency', 'Blood in stool'];
/** Red-flag entries: logged like a symptom, never used as a "pattern" and always raise a prompt. */
export const RED_FLAG = 'Blood in stool';
export const BRISTOL: [number, string][] = [
  [1, 'Separate hard lumps'],
  [2, 'Lumpy, sausage-shaped'],
  [3, 'Sausage with cracks'],
  [4, 'Smooth and soft'],
  [5, 'Soft blobs'],
  [6, 'Mushy, ragged'],
  [7, 'Watery'],
];
/** Built-in food tags: [tag, FODMAP group or '' when it is not a FODMAP group]. */
export const FOOD_TAGS: [string, string][] = [
  ['Dairy', 'Lactose'],
  ['Wheat and gluten', 'Fructans'],
  ['Onion and garlic', 'Fructans'],
  ['Beans and lentils', 'GOS'],
  ['Apples, pears, stone fruit', 'Polyols and fructose'],
  ['Honey, mango, agave', 'Fructose'],
  ['Sugar alcohols', 'Polyols'],
  ['Fried or fatty', ''],
  ['Spicy', ''],
  ['Caffeine', ''],
  ['Alcohol', ''],
  ['Artificial sweeteners', ''],
  ['Carbonated drinks', ''],
];
export const fodmapOf = (tag: string): string => (FOOD_TAGS.find((t) => t[0] === tag) || ['', ''])[1];

export interface GutEv {
  t: string; // HH:MM
  k: 's' | 'b'; // symptom or bowel movement
  s?: string;
  v?: number; // severity 1-5
  b?: number; // Bristol 1-7
}
export interface GutDay {
  date: string; // YYYY-MM-DD
  meals: { t: string; n: string; tags: string[] }[];
  gut: GutEv[];
  water: number; // oz
  fiber: number; // g
}

const DAY = 1440;
export const minOf = (t: string): number => (/^\d\d:\d\d/.test(t || '') ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : -1);
const dayNo = (iso: string): number => Math.round(Date.parse(iso + 'T12:00:00Z') / 864e5);
const isSym = (e: GutEv, sym: string, minSev: number): boolean =>
  e.k === 's' && e.s !== RED_FLAG && (!sym || e.s === sym) && (e.v || 0) >= minSev;

/** Days from the first day with any gut entry: before that, "no symptoms" only means "not tracking yet". */
export function tracked(days: GutDay[]): GutDay[] {
  const s = [...days].sort((a, b) => (a.date < b.date ? -1 : 1)),
    i = s.findIndex((d) => d.gut.length > 0);
  return i < 0 ? [] : s.slice(i);
}

export interface TagRow {
  tag: string;
  n: number; // meals with the tag
  hit: number; // ... followed by the symptom in the window
  on: number; // meals without the tag
  ohit: number;
  flag: boolean; // worth testing: enough meals and a clear difference
}
/** For each food tag: how often meals with it were followed by the symptom `win` hours later, against other meals. */
export function tagPatterns(days: GutDay[], sym: string, win: [number, number], nowIso: string, nowMin: number, minSev = 2): { rows: TagRow[]; meals: number } {
  const d = tracked(days),
    syms: number[] = [],
    meals: { at: number; tags: string[] }[] = [],
    nowAt = dayNo(nowIso) * DAY + nowMin;
  for (const x of d) {
    const base = dayNo(x.date) * DAY;
    for (const e of x.gut) if (isSym(e, sym, minSev) && minOf(e.t) >= 0) syms.push(base + minOf(e.t));
    for (const m of x.meals) if (minOf(m.t) >= 0) meals.push({ at: base + minOf(m.t), tags: m.tags });
  }
  // a meal counts once its whole window has passed
  const done = meals.filter((m) => m.at + win[1] * 60 <= nowAt),
    hitOf = (m: { at: number }) => syms.some((s) => s >= m.at + win[0] * 60 && s <= m.at + win[1] * 60),
    tags = [...new Set(done.flatMap((m) => m.tags))];
  const rows = tags.map((tag) => {
    const w = done.filter((m) => m.tags.includes(tag)),
      o = done.filter((m) => !m.tags.includes(tag)),
      hit = w.filter(hitOf).length,
      ohit = o.filter(hitOf).length,
      flag = w.length >= 5 && o.length >= 5 && hit >= 3 && hit / w.length - ohit / o.length >= 0.25;
    return { tag, n: w.length, hit, on: o.length, ohit, flag };
  });
  const diff = (r: TagRow) => (r.n ? r.hit / r.n : 0) - (r.on ? r.ohit / r.on : 0);
  rows.sort((a, b) => Number(b.flag) - Number(a.flag) || diff(b) - diff(a) || b.n - a.n);
  return { rows, meals: done.length };
}

const avg = (a: number[]): number | null => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export interface DayCompare {
  symDays: number;
  calmDays: number;
  rows: { label: string; sym: number | null; calm: number | null; unit: string }[];
}
/** Fiber, water and stool form on days with symptoms against days without. */
export function compareDays(days: GutDay[], minSev = 2): DayCompare {
  const d = tracked(days),
    S = d.filter((x) => x.gut.some((e) => isSym(e, '', minSev))),
    C = d.filter((x) => !x.gut.some((e) => isSym(e, '', minSev))),
    bristol = (xs: GutDay[]) => avg(xs.flatMap((x) => x.gut.filter((e) => e.k === 'b').map((e) => e.b || 0))),
    bms = (xs: GutDay[]) => avg(xs.map((x) => x.gut.filter((e) => e.k === 'b').length));
  return {
    symDays: S.length,
    calmDays: C.length,
    rows: [
      { label: 'Fiber', sym: avg(S.map((x) => x.fiber)), calm: avg(C.map((x) => x.fiber)), unit: 'g' },
      { label: 'Water', sym: avg(S.map((x) => x.water)), calm: avg(C.map((x) => x.water)), unit: 'oz' },
      { label: 'Bowel movements', sym: bms(S), calm: bms(C), unit: 'a day' },
      { label: 'Stool form (Bristol)', sym: bristol(S), calm: bristol(C), unit: '' },
    ],
  };
}

export interface GutSummary {
  days: number;
  symptoms: [string, number, number][]; // name, count, average severity
  bms: number;
  bristolAvg: number | null;
  fiberAvg: number | null;
  waterAvg: number | null;
}
export function summarize(days: GutDay[]): GutSummary {
  const by: Record<string, number[]> = {};
  days.forEach((x) => x.gut.forEach((e) => e.k === 's' && e.s && (by[e.s] = by[e.s] || []).push(e.v || 0)));
  const bs = days.flatMap((x) => x.gut.filter((e) => e.k === 'b').map((e) => e.b || 0));
  return {
    days: days.length,
    symptoms: Object.entries(by)
      .map(([s, v]) => [s, v.length, avg(v) || 0] as [string, number, number])
      .sort((a, b) => b[1] - a[1]),
    bms: bs.length,
    bristolAvg: avg(bs),
    fiberAvg: avg(days.filter((x) => x.meals.length || x.fiber).map((x) => x.fiber)),
    waterAvg: avg(days.filter((x) => x.water).map((x) => x.water)),
  };
}

/** Prompts to contact a clinician. Wording stays factual; the app does not diagnose. */
export function gutAlerts(days: GutDay[], todayIso: string): string[] {
  const out: string[] = [],
    byDate: Record<string, GutDay> = {};
  days.forEach((x) => (byDate[x.date] = x));
  const back = (n: number) => {
    const t = Date.parse(todayIso + 'T12:00:00Z') - n * 864e5;
    return new Date(t).toISOString().slice(0, 10);
  };
  const last7 = [0, 1, 2, 3, 4, 5, 6].map((n) => byDate[back(n)]).filter(Boolean) as GutDay[];
  const blood = last7.find((x) => x.gut.some((e) => e.k === 's' && e.s === RED_FLAG));
  if (blood) out.push(`Blood in stool logged on ${blood.date}. Contact your provider promptly, and get urgent care if it is heavy or comes with dizziness or weakness.`);
  if ([0, 1, 2].every((n) => byDate[back(n)] && byDate[back(n)].gut.some((e) => e.k === 'b' && e.b === 7)))
    out.push('Watery stools three days running. Drink fluids with electrolytes and contact your provider, sooner with fever, blood or severe pain.');
  const bs = last7.flatMap((x) => x.gut.filter((e) => e.k === 'b').map((e) => e.b || 0));
  if (bs.length >= 3 && bs.every((b) => b <= 2))
    out.push('Only hard stools (Bristol 1 to 2) this week. Fiber and water often help; contact your provider if it continues or comes with pain.');
  const today = byDate[todayIso];
  if (today && today.gut.some((e) => e.k === 's' && e.s !== RED_FLAG && (e.v || 0) >= 5))
    out.push('Severe symptom logged today. If pain is severe, constant or getting worse, seek care.');
  return out;
}

export interface Elim {
  start: string;
  days: number;
  tags: string[];
  re?: { tag: string; d: string }[];
}
export interface ElimResult {
  label: string;
  days: number;
  symDays: number;
}
/** Symptom days per period: 14 days before the plan, during it, and the 3 days after each reintroduction. */
export function elimResults(e: Elim, days: GutDay[], todayIso: string, minSev = 2): ElimResult[] {
  const byDate: Record<string, GutDay> = {};
  days.forEach((x) => (byDate[x.date] = x));
  const add = (iso: string, n: number) => new Date(Date.parse(iso + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const span = (from: string, n: number, label: string): ElimResult => {
    let have = 0,
      sym = 0;
    for (let i = 0; i < n; i++) {
      const iso = add(from, i);
      if (iso > todayIso) break;
      const x = byDate[iso];
      if (!x || !x.gut.length) continue; // only days with gut entries count
      have++;
      if (x.gut.some((g) => isSym(g, '', minSev))) sym++;
    }
    return { label, days: have, symDays: sym };
  };
  const out = [span(add(e.start, -14), 14, 'Before the plan (14 days)'), span(e.start, e.days, 'During the plan')];
  for (const r of e.re || []) out.push(span(r.d, 3, `3 days after adding back ${r.tag}`));
  return out;
}
