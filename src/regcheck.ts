// A regimen file: the daily windows, the checklist items and version notes, plus a few optional labels.
// The built-in one is src/regimen.json. Files loaded in the app are checked here first; text that could be
// read as markup is refused, because some labels are shown as HTML.

export interface Regimen {
  format: 'daily-regimen';
  version: 1;
  name?: string;
  /** [time "HH:MM", name]; the last window is lights out. */
  windows: [string, string][];
  /** [window index, label, 'A' every day | 'L' lifting days | 'R' recovery days, days '' | 'wd' | 'mt' | 'mo', start date YYYY-MM-DD] */
  items: [number, string, string, string?, string?][];
  /** [version, date, [change, ...]] */
  notes?: [string, string, string[]][];
  /** Pattern for injectables that go in the abdominal fat pad. Default: peptide */
  peptides?: string;
  /** Extra line shown when systolic is under 110. */
  bpLow?: string;
  /** Item used in voice examples, such as "took <voice>". */
  voice?: string;
  /** Items worth raising before a procedure. */
  procedure?: string;
  /** A window that retires when the last linked vial of an item is empty. */
  retire?: { item: string; vial: string; window: string; after: string };
  /** Extra [label, item pattern] factors for the awakening analysis. */
  sleep?: [string, string][];
}

const cache: Record<string, RegExp | null> = {};
/** Case-insensitive test of a pattern from a regimen file; a pattern that does not compile matches nothing. */
export function reTest(pattern: string, text: string): boolean {
  if (!(pattern in cache)) {
    try {
      cache[pattern] = new RegExp(pattern, 'i');
    } catch (e) {
      cache[pattern] = null;
    }
  }
  const re = cache[pattern];
  return !!re && re.test(text);
}

const str = (v: any, max = 300) => typeof v === 'string' && v.length <= max && !/[<>]/.test(v);
const okRe = (v: any) => {
  if (!str(v, 200)) return false;
  try {
    new RegExp(v, 'i');
    return true;
  } catch (e) {
    return false;
  }
};

/** Returns a reason the file cannot be used, or '' when it is a valid regimen. */
export function checkRegimen(r: any): string {
  if (!r || typeof r !== 'object' || r.format !== 'daily-regimen') return 'This is not a Daily regimen file.';
  if (r.version !== 1) return 'This regimen file is from a newer version of Daily.';
  const W = r.windows;
  if (!Array.isArray(W) || W.length < 1 || W.length > 24) return 'The regimen needs 1 to 24 windows.';
  for (const w of W)
    if (!Array.isArray(w) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(w[0]) || !str(w[1], 60) || !w[1])
      return 'Each window needs a time like 08:00 and a short name, without < or >.';
  for (let i = 1; i < W.length; i++) if (W[i][0] <= W[i - 1][0]) return 'Windows must be in time order.';
  const I = r.items;
  if (!Array.isArray(I) || I.length < 1 || I.length > 400) return 'The regimen needs 1 to 400 items.';
  for (const x of I) {
    if (!Array.isArray(x) || !Number.isInteger(x[0]) || x[0] < 0 || x[0] >= W.length)
      return 'Each item needs a window number from 0 to ' + (W.length - 1) + '.';
    if (!str(x[1], 200) || !x[1]) return 'Each item needs a label of up to 200 characters, without < or >.';
    if (!['A', 'L', 'R'].includes(x[2])) return 'Item "' + x[1] + '": the day type must be A, L or R.';
    if (x[3] != null && !['', 'wd', 'mt', 'mo'].includes(x[3])) return 'Item "' + x[1] + '": days must be empty, wd, mt or mo.';
    if (x[4] != null && x[4] !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(x[4])) return 'Item "' + x[1] + '": the start date must look like 2026-11-01.';
  }
  if (r.notes != null) {
    if (!Array.isArray(r.notes) || r.notes.length > 100) return 'Version notes must be a list.';
    for (const n of r.notes)
      if (!Array.isArray(n) || !str(n[0], 40) || !str(n[1], 40) || !Array.isArray(n[2]) || !n[2].every((t) => str(t, 400)))
        return 'Each version note needs a version, a date and a list of changes, without < or >.';
  }
  for (const k of ['name', 'bpLow', 'voice', 'procedure']) if (r[k] != null && !str(r[k], 200)) return 'The "' + k + '" text is too long or has < or >.';
  if (r.peptides != null && !okRe(r.peptides)) return 'The "peptides" pattern is not valid.';
  if (r.retire != null) {
    const t = r.retire;
    if (!t || !okRe(t.item) || !str(t.vial, 60) || !str(t.window, 60) || !str(t.after, 100))
      return 'The "retire" section needs item, vial, window and after.';
  }
  if (r.sleep != null && (!Array.isArray(r.sleep) || r.sleep.length > 10 || !r.sleep.every((p) => Array.isArray(p) && str(p[0], 40) && okRe(p[1]))))
    return 'The "sleep" section must be a list of [label, pattern].';
  return '';
}
