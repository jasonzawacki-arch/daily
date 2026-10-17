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
  /** Optional lifting program, applied with the regimen (same shape as a program file). */
  program?: ProgramFile;
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
  if (r.program != null) {
    const why = checkProgram(r.program);
    if (why) return 'Lifting program: ' + why;
  }
  if (r.sleep != null && (!Array.isArray(r.sleep) || r.sleep.length > 10 || !r.sleep.every((p) => Array.isArray(p) && str(p[0], 40) && okRe(p[1]))))
    return 'The "sleep" section must be a list of [label, pattern].';
  return '';
}

/** A lifting program file: the cycle of days and their exercises (the Program tab). */
export interface ProgramFile {
  format: 'daily-program';
  version: 1;
  name?: string;
  /** One line about the program, shown with templates. */
  about?: string;
  /** Template tags shown in the template picker: who it suits and what it builds. */
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  goal?: string;
  /** 'cycle' (default): days rotate, the next day follows the last completed one. 'week': 7 days, Monday first. */
  sched?: 'cycle' | 'week';
  /** HIT style: one working set to failure, feeder sets and short rest options. */
  hit?: boolean;
  /** Days in cycle order; a day with off: true is a rest day. */
  /** Exercise extras: k kind (bw bodyweight, as assisted, tm timed in seconds), tq technique (rp rest-pause, myo
   *  myo-reps, drop drop sets, fr forced reps; rp: true is the older way to say rest-pause), rir target reps in
   *  reserve (0 to 5), u one side at a time, rs rest between sets in seconds (10 to 600). */
  days: {
    n: string;
    off?: boolean;
    ex: { n: string; s: number; r: string; t?: string; g?: string; rp?: boolean; ss?: boolean; wu?: string; k?: 'bw' | 'as' | 'tm'; tq?: 'rp' | 'myo' | 'drop' | 'fr'; rir?: number; u?: boolean; rs?: number }[];
  }[];
}

/** Returns a reason the program cannot be used, or '' when it is valid. */
export function checkProgram(p: any): string {
  if (!p || typeof p !== 'object' || p.format !== 'daily-program') return 'This is not a Daily program file.';
  if (p.version !== 1) return 'This program file is from a newer version of Daily.';
  if (p.name != null && !str(p.name, 80)) return 'The program name is too long or has < or >.';
  if (p.about != null && !str(p.about, 400)) return 'The "about" text is too long or has < or >.';
  if (p.hit != null && typeof p.hit !== 'boolean') return '"hit" must be true or false.';
  if (p.sched != null && p.sched !== 'cycle' && p.sched !== 'week') return '"sched" must be "cycle" or "week".';
  const D = p.days;
  if (!Array.isArray(D) || D.length < 1 || D.length > 14) return 'The program needs 1 to 14 days.';
  if (p.sched === 'week' && D.length !== 7) return 'A weekly program needs exactly 7 days, Monday first (use "off": true for rest days).';
  if (!D.some((d) => d && !d.off && Array.isArray(d.ex) && d.ex.length)) return 'The program needs at least one training day with exercises.';
  for (const d of D) {
    if (!d || typeof d !== 'object' || !str(d.n, 60) || !d.n) return 'Each day needs a short name, without < or >.';
    if (d.off != null && typeof d.off !== 'boolean') return 'Day "' + d.n + '": "off" must be true or false.';
    if (!Array.isArray(d.ex) || d.ex.length > 30) return 'Day "' + d.n + '": exercises must be a list of up to 30.';
    for (const e of d.ex) {
      if (!e || typeof e !== 'object' || !str(e.n, 80) || !e.n) return 'Day "' + d.n + '": each exercise needs a name, without < or >.';
      if (!Number.isInteger(e.s) || e.s < 1 || e.s > 10) return '"' + e.n + '": sets must be a whole number from 1 to 10.';
      if (typeof e.r !== 'string' || !/^\d{1,3}(-\d{1,3})?$/.test(e.r)) return '"' + e.n + '": reps must look like 8 or 6-8.';
      if ((e.t != null && !str(e.t, 300)) || (e.wu != null && !str(e.wu, 200)) || (e.g != null && !str(e.g, 20)))
        return '"' + e.n + '": a note is too long or has < or >.';
      if ((e.rp != null && typeof e.rp !== 'boolean') || (e.ss != null && typeof e.ss !== 'boolean') || (e.u != null && typeof e.u !== 'boolean'))
        return '"' + e.n + '": rp, ss and u must be true or false.';
      if (e.k != null && !['bw', 'as', 'tm'].includes(e.k)) return '"' + e.n + '": "k" must be "bw", "as" or "tm".';
      if (e.tq != null && !['rp', 'myo', 'drop', 'fr'].includes(e.tq)) return '"' + e.n + '": "tq" must be "rp", "myo", "drop" or "fr".';
      if (e.rs != null && (!Number.isInteger(e.rs) || e.rs < 10 || e.rs > 600)) return '"' + e.n + '": "rs" (rest) must be whole seconds from 10 to 600.';
      if (e.rir != null && (!Number.isInteger(e.rir) || e.rir < 0 || e.rir > 5)) return '"' + e.n + '": "rir" must be a whole number from 0 to 5.';
    }
  }
  return '';
}

const EXK = ['n', 's', 'r', 't', 'g', 'rp', 'ss', 'wu', 'k', 'tq', 'rir', 'u', 'rs'];
const pick = (e: any) => Object.fromEntries(EXK.filter((k) => e[k] != null && e[k] !== false && e[k] !== '' && !(k === 't' && e[k] === '')).map((k) => [k, e[k]]));
/** The program as the app stores it (mem.prog), without the file fields. */
export const programData = (p: ProgramFile) => ({
  ...(p.name ? { name: p.name } : {}),
  ...(p.about ? { about: p.about } : {}),
  ...(p.sched === 'week' ? { sched: 'week' } : {}),
  ...(p.hit ? { hit: true } : {}),
  days: p.days.map((d) => ({ n: d.n, ...(d.off ? { off: true } : {}), ex: d.ex.map((e) => ({ t: '', ...pick(e), g: e.g || 'Other' })) })),
});
/** A program file for the app's current program. */
export const programFile = (prog: any, name = ''): ProgramFile => ({
  format: 'daily-program',
  version: 1,
  ...(name ? { name } : {}),
  ...(prog.about ? { about: prog.about } : {}),
  sched: prog.sched === 'week' ? 'week' : 'cycle',
  ...(prog.hit ? { hit: true } : {}),
  days: (prog.days || []).map((d) => ({ n: d.n, ...(d.off ? { off: true } : {}), ex: (d.ex || []).map(pick) as any })),
});
