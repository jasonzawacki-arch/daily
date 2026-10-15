// Supply planning: how long what you have will last, when to reorder, and whether a subscription matches what you use.
// Pure functions over plain records, so every number can be tested on its own. Amounts are in the item's own unit
// (capsules, scoops, grams, mL); a container holds `per` of them. Dates are local YYYY-MM-DD strings.

export interface Store {
  id: string;
  n: string; // name, such as "Amazon Prime"
  days: number; // usual days from ordering to arrival
}

export interface Sub {
  every: number; // days between deliveries
  qty: number; // containers per delivery
  next: string; // next delivery date
}

/** A supply record as Daily stores it. Older records only have n, c, k and q, and c is then the whole count. */
export interface Supply {
  n: string; // name
  c: number; // amount left in the open container (or the whole count, for an older record without `per`)
  k?: string | null; // linked checklist item: checking it off uses q
  q?: number; // amount used per check
  pd?: number; // amount used per day, for an item not linked to the checklist
  o?: string; // opened date (older records)
  b?: string; // brand
  u?: string; // unit
  per?: number; // amount in a full container
  s?: number; // sealed containers on hand
  st?: string; // store id
  link?: string; // usual product page
  price?: number; // last price paid per container
  rx?: boolean; // prescription: refill, never price-shop
  rf?: number; // refills remaining
  buf?: number; // days of margin before running out (default 7)
  sub?: Sub | null;
}

export const DEFAULT_BUFFER = 7;
export const SOON_DAYS = 7; // a reorder date this close shows on Today
export const PLAN_DAYS = 21; // the reorder plan looks this far ahead

const DAY = 864e5;
export const dayNum = (s: string) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY);
export const fromNum = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fromNum(dayNum(s) + n);

/** Everything on hand: the open container plus sealed ones. */
export function onHand(x: Supply): number {
  return Math.max(0, x.c || 0) + (x.per ? Math.max(0, x.s || 0) * x.per : 0);
}

export interface Projection {
  total: number; // amount on hand
  perDay: number; // amount used per day (0 = unknown)
  daysLeft: number | null; // whole days the stock on hand lasts, deliveries not counted
  runOut: string | null; // first day without enough, counting subscription deliveries
  reorderBy: string | null; // last day to order, given delivery time and margin (none on a subscription that keeps up)
  status: 'ok' | 'soon' | 'now' | 'unknown';
  sub?: SubFit;
}

export interface SubFit {
  perDelivery: number; // amount each delivery brings
  lasts: number; // days one delivery lasts at the current pace
  verdict: 'fits' | 'over' | 'short';
  suggestEvery: number; // days: the delivery interval that matches use, rounded to whole weeks
  extraPerYear: number; // containers a year beyond what is used (over), or short (short)
}

/**
 * Project one supply forward from `today`.
 * perDay comes from the caller (checklist history or schedule); storeDays is the usual delivery time where it is bought.
 */
export function project(x: Supply, perDay: number, today: string, storeDays = 0): Projection {
  const total = onHand(x);
  if (!(perDay > 0)) return { total, perDay: 0, daysLeft: null, runOut: null, reorderBy: null, status: 'unknown' };
  const daysLeft = Math.floor(total / perDay + 1e-9);
  const margin = (x.buf ?? DEFAULT_BUFFER) + Math.max(0, storeDays || 0);
  let runOut = addDays(today, daysLeft);
  let sub: SubFit | undefined;
  if (x.sub && x.sub.every > 0 && x.sub.qty > 0 && x.per) {
    const perDelivery = x.sub.qty * x.per;
    const lasts = perDelivery / perDay;
    // walk forward a year, adding deliveries, to find the first day the stock would not cover
    let stock = total,
      next = dayNum(x.sub.next || today),
      t = dayNum(today);
    let out: number | null = null;
    for (let d = t; d < t + 366; d++) {
      while (next <= d) {
        stock += perDelivery;
        next += x.sub.every;
      }
      if (stock + 1e-9 < perDay) {
        out = d;
        break;
      }
      stock -= perDay;
    }
    runOut = out == null ? null : fromNum(out);
    const ratio = lasts / x.sub.every;
    const verdict: SubFit['verdict'] = ratio > 1.15 ? 'over' : out != null || ratio < 0.95 ? 'short' : 'fits';
    const suggestEvery = Math.max(7, Math.round(lasts / 7) * 7);
    const extraPerYear = Math.round(((365 / x.sub.every) * perDelivery - 365 * perDay) / x.per * 10) / 10;
    sub = { perDelivery, lasts, verdict, suggestEvery, extraPerYear };
  }
  const reorderBy = runOut == null ? null : addDays(runOut, -margin);
  const left = reorderBy == null ? null : dayNum(reorderBy) - dayNum(today);
  const status: Projection['status'] = left == null ? 'ok' : left <= 0 ? 'now' : left <= SOON_DAYS ? 'soon' : 'ok';
  return { total, perDay, daysLeft, runOut, reorderBy, status, sub };
}

/**
 * Average daily use of a linked checklist item. With a week or more of logged days, from how often it was actually
 * checked in the last 14 logged days; before that, from its schedule (days of the week, and lifting or recovery days).
 */
export function checksPerDay(checkedOn: boolean[], scheduledDays: number, dayType: string): number {
  if (checkedOn.length >= 7) return checkedOn.filter(Boolean).length / checkedOn.length;
  const share = dayType === 'L' ? 4 / 7 : dayType === 'R' ? 3 / 7 : 1;
  return (scheduledDays / 7) * share;
}

/** Items to order in the next `days`, grouped by store, soonest first. Prescription items are listed as refills. */
export function plan<T extends { x: Supply; p: Projection }>(rows: T[], today: string, days = PLAN_DAYS) {
  const due = rows
    .filter((r) => r.p.reorderBy && dayNum(r.p.reorderBy) - dayNum(today) <= days)
    .sort((a, b) => (a.p.reorderBy! < b.p.reorderBy! ? -1 : 1));
  const groups = new Map<string, T[]>();
  for (const r of due) {
    const k = r.x.rx ? 'rx' : r.x.st || '';
    groups.set(k, [...(groups.get(k) || []), r]);
  }
  return groups;
}

/** A label read by AI, checked before it fills the form. Anything that does not make sense is dropped. */
export interface Label {
  brand?: string;
  product?: string;
  unit?: string;
  per?: number; // amount in a full container, in `unit`
  serving?: number; // amount per serving on the label, in `unit`
  rx?: boolean;
}
export function cleanLabel(raw: any): Label {
  const o = raw && typeof raw === 'object' ? raw : {};
  const str = (v: any, n = 80) => (typeof v === 'string' && v.trim() ? v.trim().replace(/[<>]/g, '').slice(0, n) : undefined);
  const num = (v: any) => {
    const f = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return isFinite(f) && f > 0 && f < 1e6 ? Math.round(f * 1000) / 1000 : undefined;
  };
  const unit = str(o.unit, 20)?.toLowerCase();
  return {
    brand: str(o.brand),
    product: str(o.product),
    unit,
    per: num(o.amountPerContainer ?? o.per),
    serving: num(o.servingSize ?? o.serving),
    rx: o.prescription === true || o.rx === true,
  };
}

/** Pull the first JSON object out of a model's reply, which may wrap it in prose or a code fence. */
export function firstJson(text: string): any {
  const m = /\{[\s\S]*\}/.exec(text || '');
  if (!m) throw new Error('The reply had no label details in it.');
  return JSON.parse(m[0]);
}
