// Training math and data shared by the lift log: estimated 1RM with reps in reserve, progression,
// warm-up ramps, exercise kinds and techniques, the exercise library with swaps, and Strong/Hevy import.
// Pure functions only (no DOM, no storage) so they are easy to test and reuse.

/** Exercise kinds. w: weight x reps. bw: bodyweight, weight is added load. as: assisted, weight is the assistance.
 *  tm: timed hold, reps are seconds (weight optional). */
export type Kind = 'w' | 'bw' | 'as' | 'tm';
/** Set techniques an exercise can use after its working sets. */
export type Tech = '' | 'rp' | 'myo' | 'drop' | 'fr';
export const TECH: [Tech, string, string][] = [
  ['', 'None', ''],
  ['rp', 'Rest-pause', 'After the last working set, rest 15 s and go again to failure with the same weight.'],
  ['myo', 'Myo-reps', 'One activation set, then 3 mini-sets of 3 to 5 reps with 5 deep breaths between.'],
  ['drop', 'Drop sets', 'Right after the last working set, drop the weight about 20% and go again, twice.'],
  ['fr', 'Forced reps', 'At failure on the last set, a partner helps you through 1 to 3 more reps.'],
];
/** Set type letters stored on a logged set (s.t). W warm-up, F failure, D drop, R rest-pause, M myo mini-set, X forced reps. */
export const ADDON = ['R', 'M', 'X', 'D'];
/** Extra rows each technique adds after the working sets, and the type letter they get. */
export const TECH_ROWS: Record<string, [number, string]> = { rp: [1, 'R'], myo: [3, 'M'], drop: [2, 'D'], fr: [1, 'X'] };
export const techOf = (e: any): Tech => (e && (e.tq || (e.rp ? 'rp' : ''))) || '';
export const ROWLAB: Record<string, string> = { W: 'W', R: 'RP', M: 'M', X: 'FR', D: 'D' };

/** A set counts as logged when it has reps and a weight (0 is a real weight for bodyweight, assisted and timed). */
export const logged = (s: any) => !!(s && s.r > 0 && (s.w > 0 || s.w === 0));
/** Working sets: logged, not warm-ups or technique add-ons. */
export const working = (s: any) => logged(s) && s.t !== 'W' && !ADDON.includes(s.t);

/** Reps to failure: reps done plus reps in reserve (RIR). A set marked failure, or with no RIR logged, is at 0. */
export const toFail = (s: any) => (s.r || 0) + (typeof s.q === 'number' ? s.q : 0);

/** Estimated one-rep max (Epley) from load and reps to failure. Above 20 reps the estimate is not useful. */
export function e1rm(load: number, reps: number): number {
  if (!(load > 0) || !(reps > 0)) return 0;
  if (reps === 1) return load;
  return load * (1 + Math.min(reps, 20) / 30);
}
/** Load that should give `reps` to failure for a given e1RM (inverse of e1rm). */
export const loadFor = (e1: number, reps: number) => (reps <= 1 ? e1 : e1 / (1 + Math.min(reps, 20) / 30));

/** The load the body actually moves for a set of this kind (bodyweight kinds need the body weight). */
export function effLoad(kind: Kind, w: number, bw: number): number {
  if (kind === 'tm') return 0;
  if (kind === 'bw') return bw > 0 ? bw + (w || 0) : 0;
  if (kind === 'as') return bw > 0 ? Math.max(0, bw - (w || 0)) : 0;
  return w || 0;
}
export function setE1(s: any, kind: Kind, bw: number): number {
  if (!working(s)) return 0;
  return e1rm(effLoad(kind, s.w, bw), toFail(s));
}

const r2 = (x: number, st: number) => Math.round(x / st) * st;

export interface Prog {
  w?: number; // next weight (added load for bw, assistance for as)
  r?: number; // target reps for the top set
  t: string; // one-line explanation
  big?: boolean; // a larger than usual jump because of reps in reserve
}
/**
 * Next session's target from last session's working sets.
 * lo-hi: the rep range. tr: target RIR (0 = to failure). inc: the normal weight jump. st: the smallest plate step.
 */
export function progress(o: {
  sets: any[];
  lo: number;
  hi: number;
  n: number;
  tr: number;
  inc: number;
  st: number;
  kind: Kind;
  bw: number;
  u: string;
}): Prog | null {
  const { lo, hi, tr, inc, st, kind, u, bw } = o,
    ws = o.sets.filter(working);
  if (!ws.length) return null;
  const top = ws.slice(0, Math.max(o.n, 1)),
    hasQ = ws.some((s) => typeof s.q === 'number'),
    q = (s: any) => (typeof s.q === 'number' ? s.q : tr),
    spare = Math.min(...top.map((s) => q(s) - tr)), // reps in reserve beyond the target on the hardest set
    allTop = top.length >= Math.min(o.n, ws.length) && top.every((s) => s.r >= hi),
    weak = ws.filter((s) => s.r < lo).length >= Math.ceil(ws.length / 2),
    mw = kind === 'as' ? Math.min(...ws.map((s) => s.w || 0)) : Math.max(...ws.map((s) => s.w || 0)),
    bestR = Math.max(...ws.map((s) => s.r));
  if (kind === 'tm') {
    if (allTop) return { r: hi + 5, t: `Held ${hi} s on every set. Aim for ${hi + 5} s, or add weight and drop back to ${lo} s.` };
    return { r: Math.min(hi, bestR + 5), t: `Aim for ${Math.min(hi, bestR + 5)} s on your first set.` };
  }
  if (allTop) {
    // Weight that should land at the bottom of the range at the target RIR, from last session's best set.
    const e1 = Math.max(...top.map((s) => e1rm(effLoad(kind, s.w, bw), s.r + q(s)))),
      want = e1 > 0 ? loadFor(e1, lo + tr) : 0;
    let w: number,
      big = spare >= 2;
    if (kind === 'as') {
      // Less assistance is progress.
      const drop = big ? inc * 2 : inc;
      w = Math.max(0, mw - drop);
      return { w, r: lo, big, t: w === 0 ? `Hit ${hi} reps with ${mw} ${u} of help. Try it with no assistance.` : `Hit ${hi} reps on every set. Take ${mw - w} ${u} less assistance: ${w} ${u}.` };
    }
    const base = kind === 'bw' ? Math.max(0, want - bw) : want;
    const lo1 = mw + inc,
      hi1 = mw + inc * (big ? 4 : 2);
    w = base > 0 ? Math.min(hi1, Math.max(lo1, r2(base, st))) : lo1;
    big = big || w > mw + inc;
    const why = hasQ && spare >= 1 ? ` You had ${spare} rep${spare > 1 ? 's' : ''} in reserve beyond your target, so this is a bigger jump.` : '';
    return {
      w,
      r: lo,
      big,
      t:
        kind === 'bw' && mw === 0 && w > 0
          ? `Hit ${hi} reps on every set. Add ${w} ${u} (belt or vest), or a harder variation.`
          : `Hit ${hi} reps on every set. Next: ${w} ${u} (+${w - mw}), aim for ${lo} or more.${why}`,
    };
  }
  if (weak && spare <= 0) {
    const w = kind === 'as' ? mw + inc : Math.max(0, r2(mw * 0.95, st));
    return { w, r: lo, t: kind === 'as' ? `Fell below ${lo} reps. Take ${inc} ${u} more assistance: ${w} ${u}.` : `Fell below ${lo} reps on most sets. Back off to ${w} ${u}.` };
  }
  if (hasQ && spare >= 2) {
    const r = Math.min(hi, bestR + spare);
    return { w: mw, r, t: `You stopped with ${spare} more reps in reserve than your target. Stay at ${mw} ${u} and push for ${r} reps.` };
  }
  const r = Math.min(hi, bestR + 1);
  return { w: mw, r, t: `Stay at ${mw} ${u} and aim for ${r} reps on your top set.` };
}

/**
 * Warm-up sets for a working weight. Heavier, lower-rep work gets more steps; an exercise for a muscle already
 * warmed up this session gets one feeder set. Bar weight is the floor for barbell lifts.
 */
export function warmups(o: { work: number; lo: number; heavy: boolean; warm: boolean; bar: number; st: number; kind: Kind }): { w: number; r: number }[] {
  const { work, lo, heavy, warm, bar, st, kind } = o;
  if (!(work > 0) || kind === 'tm' || kind === 'as') return [];
  let plan: [number, number][];
  if (kind === 'bw') plan = [[0, 8]];
  else if (warm) plan = [[0.6, 5]];
  else if (!heavy) plan = lo >= 10 ? [[0.5, 10]] : [[0.5, 8], [0.75, 4]];
  else if (lo <= 3) plan = [[0, 10], [0.4, 5], [0.6, 3], [0.75, 2], [0.85, 1], [0.92, 1]];
  else if (lo <= 6) plan = [[0, 10], [0.45, 5], [0.65, 3], [0.8, 2], [0.9, 1]];
  else plan = [[0.5, 8], [0.7, 4], [0.85, 2]];
  const out: { w: number; r: number }[] = [];
  for (const [p, r] of plan) {
    let w = kind === 'bw' ? 0 : p === 0 ? (heavy ? bar : r2(work * 0.4, st)) : r2(work * p, st);
    if (heavy && kind === 'w') w = Math.max(bar, w);
    if (kind === 'w' && (w >= work || (out.length && w <= out[out.length - 1].w))) continue;
    out.push({ w, r });
  }
  // Big jumps on a light working weight make silly ramps (bar, bar, bar): keep the distinct steps only.
  return out;
}
export const HEAVY = (n: string) =>
  /squat|deadlift|bench press|overhead press|barbell row|hip thrust|leg press|hack squat|clean|incline bench|military|pendlay/i.test(n) &&
  !/goblet|split|bulgarian|pistol|dumbbell bench|dumbbell row/i.test(n);

// ---------------------------------------------------------------------------------------------------------
// Exercise library. [name, muscle group, movement pattern, equipment, kind, one-line cue, anchor lift, ratio]
// The anchor and ratio give a rough starting weight from a related lift (same reps): ratio x anchor.
// ---------------------------------------------------------------------------------------------------------
type Row = [string, string, string, string, Kind, string, string?, number?];
const R: Row[] = [
  ['Bench press', 'Chest', 'hpush', 'barbell', 'w', 'Shoulder blades pinched, feet planted, bar to mid-chest, press up and slightly back.'],
  ['Incline bench press', 'Chest', 'ipush', 'barbell', 'w', 'Bench at 30 degrees. Bar to upper chest, elbows about 45 degrees from the body.', 'Bench press', 0.8],
  ['Close-grip bench press', 'Triceps', 'hpush', 'barbell', 'w', 'Hands shoulder-width, elbows tucked, touch lower chest.', 'Bench press', 0.85],
  ['Dumbbell bench press', 'Chest', 'hpush', 'dumbbell', 'w', 'Weight per dumbbell. Lower until elbows are just below the bench, press together.', 'Bench press', 0.37],
  ['Incline dumbbell press', 'Chest', 'ipush', 'dumbbell', 'w', 'Weight per dumbbell. Bench at 30 degrees, elbows slightly in, full stretch at the bottom.', 'Bench press', 0.32],
  ['Smith flat press', 'Chest', 'hpush', 'smith', 'w', 'Bar path fixed: set the bench so the bar meets mid-chest.', 'Bench press', 0.9],
  ['Smith incline press', 'Chest', 'ipush', 'smith', 'w', 'Bench at 30 degrees, bar to upper chest, controlled 2 s lowering.', 'Bench press', 0.8],
  ['Machine chest press', 'Chest', 'hpush', 'machine', 'w', 'Seat so the handles line up with mid-chest. Do not let the shoulders roll forward.', 'Bench press', 0.9],
  ['Push-up', 'Chest', 'hpush', 'bodyweight', 'bw', 'Body in a straight line, chest to the floor, elbows about 45 degrees.'],
  ['Dip', 'Triceps', 'dip', 'bodyweight', 'bw', 'Lean forward slightly for chest, stay upright for triceps. Shoulders below elbows only if comfortable.'],
  ['Assisted dip', 'Triceps', 'dip', 'machine', 'as', 'Weight is the assistance: less is harder.'],
  ['Dumbbell fly', 'Chest', 'fly', 'dumbbell', 'w', 'Soft elbows, open wide to a stretch, hug a tree on the way up.', 'Bench press', 0.15],
  ['Incline dumbbell fly', 'Chest', 'fly', 'dumbbell', 'w', 'Bench at 30 degrees, deep stretch, stop just short of the dumbbells touching.', 'Bench press', 0.13],
  ['Cable fly', 'Chest', 'fly', 'cable', 'w', 'Step forward, slight bend in the elbows, bring hands together in front of the sternum.'],
  ['Cable crossover', 'Chest', 'fly', 'cable', 'w', 'High pulleys, cross the hands low, squeeze 2 s.'],
  ['Pec deck', 'Chest', 'fly', 'machine', 'w', 'Elbows at chest height, squeeze the handles together, slow return.'],
  ['Overhead press', 'Shoulders', 'vpush', 'barbell', 'w', 'Squeeze glutes, bar from collarbone to overhead, head through at the top.'],
  ['Seated shoulder press', 'Shoulders', 'vpush', 'dumbbell', 'w', 'Weight per dumbbell. Back against the pad, lower to ear level.', 'Overhead press', 0.4],
  ['Dumbbell shoulder press', 'Shoulders', 'vpush', 'dumbbell', 'w', 'Weight per dumbbell. Press up and slightly in, do not flare the ribs.', 'Overhead press', 0.4],
  ['Machine shoulder press', 'Shoulders', 'vpush', 'machine', 'w', 'Handles start at shoulder height, press without locking hard.', 'Overhead press', 0.9],
  ['Smith shoulder press', 'Shoulders', 'vpush', 'smith', 'w', 'Bar in front of the face to the chin, seat upright.', 'Overhead press', 0.9],
  ['Pike push-up', 'Shoulders', 'vpush', 'bodyweight', 'bw', 'Hips high, lower the head between the hands.'],
  ['Lateral raise', 'Shoulders', 'lat', 'dumbbell', 'w', 'Weight per dumbbell. Lead with the elbows, raise to shoulder height, no swinging.', 'Overhead press', 0.15],
  ['Cable lateral raise', 'Shoulders', 'lat', 'cable', 'w', 'Cable behind the body, raise out to the side, slow down.'],
  ['Machine lateral raise', 'Shoulders', 'lat', 'machine', 'w', 'Pads on the outside of the elbows, raise to shoulder height.'],
  ['Rear delt fly', 'Shoulders', 'rear', 'dumbbell', 'w', 'Hinged forward, arms wide, think pushing the hands out, not back.'],
  ['Reverse pec deck', 'Shoulders', 'rear', 'machine', 'w', 'Face the pad, arms straight, sweep back to the sides.'],
  ['Face pull', 'Shoulders', 'rear', 'cable', 'w', 'Rope at face height, pull to the forehead, thumbs back.'],
  ['Pull-up', 'Back', 'vpull', 'bodyweight', 'bw', 'Overhand grip, from a dead hang until the chin clears the bar.'],
  ['Chin-up', 'Biceps', 'vpull', 'bodyweight', 'bw', 'Underhand grip, chest to the bar, full hang at the bottom.'],
  ['Assisted pull-up', 'Back', 'vpull', 'machine', 'as', 'Weight is the assistance: less is harder.'],
  ['Lat pulldown', 'Back', 'vpull', 'cable', 'w', 'Lean back slightly, pull the bar to the upper chest, elbows down and in.'],
  ['Close-grip lat pulldown', 'Back', 'vpull', 'cable', 'w', 'V handle, pull to the sternum, full stretch at the top.'],
  ['Barbell row', 'Back', 'hpull', 'barbell', 'w', 'Hinge to about 45 degrees, pull to the belly button, no jerking.'],
  ['Pendlay row', 'Back', 'hpull', 'barbell', 'w', 'Torso flat, bar from the floor each rep, explosive pull.', 'Barbell row', 0.9],
  ['T-bar row', 'Back', 'hpull', 'machine', 'w', 'Chest supported if possible, pull to the lower chest.', 'Barbell row', 0.9],
  ['Dumbbell row', 'Back', 'hpull', 'dumbbell', 'w', 'Weight per dumbbell, one arm. Pull toward the hip, long stretch at the bottom.', 'Barbell row', 0.45],
  ['Seated cable row', 'Back', 'hpull', 'cable', 'w', 'Chest up, pull to the belly, let the shoulders reach forward at the stretch.', 'Barbell row', 0.9],
  ['Chest-supported row', 'Back', 'hpull', 'machine', 'w', 'Chest on the pad, drive the elbows back.', 'Barbell row', 0.9],
  ['Inverted row', 'Back', 'hpull', 'bodyweight', 'bw', 'Body straight under a bar or rings, pull the chest up to it.'],
  ['Dumbbell pullover', 'Back', 'pullover', 'dumbbell', 'w', 'Across a bench, arms nearly straight, lower behind the head to a stretch.'],
  ['Straight-arm pulldown', 'Back', 'pullover', 'cable', 'w', 'Arms straight, sweep the bar to the thighs using the lats.'],
  ['Deadlift', 'Back', 'hinge', 'barbell', 'w', 'Bar over mid-foot, brace, push the floor away, lock out with the glutes.'],
  ['Sumo deadlift', 'Back', 'hinge', 'barbell', 'w', 'Wide stance, toes out, hands inside the knees, chest up.', 'Deadlift', 1],
  ['Romanian deadlift', 'Hamstrings', 'hinge', 'barbell', 'w', 'Soft knees, hips back until the hamstrings stretch, bar close to the legs.', 'Deadlift', 0.65],
  ['Dumbbell Romanian deadlift', 'Hamstrings', 'hinge', 'dumbbell', 'w', 'Weight per dumbbell. Hips back, dumbbells slide down the thighs.', 'Deadlift', 0.3],
  ['Back extension', 'Hamstrings', 'hinge', 'bodyweight', 'bw', 'Hinge at the hips over the pad, squeeze glutes at the top.'],
  ['Good morning', 'Hamstrings', 'hinge', 'barbell', 'w', 'Bar on the back, soft knees, hips back until the torso is near parallel.', 'Back squat', 0.4],
  ['Shrug', 'Back', 'shrug', 'barbell', 'w', 'Straight up toward the ears, pause, no rolling.', 'Deadlift', 0.6],
  ['Power clean', 'Other', 'clean', 'barbell', 'w', 'Jump the bar up, pull under, catch on the shoulders.', 'Deadlift', 0.5],
  ['Back squat', 'Quads', 'squat', 'barbell', 'w', 'Brace, sit between the hips, knees track the toes, depth to at least parallel.'],
  ['Front squat', 'Quads', 'squat', 'barbell', 'w', 'Elbows high, torso upright, sit straight down.', 'Back squat', 0.8],
  ['Smith squat', 'Quads', 'squat', 'smith', 'w', 'Feet slightly forward of the bar, sit straight down.', 'Back squat', 0.9],
  ['Hack squat', 'Quads', 'squat', 'machine', 'w', 'Feet low on the platform for quads, full depth, do not lock out.', 'Back squat', 1],
  ['Leg press', 'Quads', 'squat', 'machine', 'w', 'Lower until the hips start to curl off the pad, push through the whole foot.', 'Back squat', 1.6],
  ['Goblet squat', 'Quads', 'squat', 'dumbbell', 'w', 'Dumbbell at the chest, elbows inside the knees at the bottom.', 'Back squat', 0.3],
  ['Bodyweight squat', 'Quads', 'squat', 'bodyweight', 'bw', 'Arms forward, sit to depth, stand tall.'],
  ['Lunge', 'Quads', 'lunge', 'dumbbell', 'w', 'Weight per dumbbell. Long step, back knee toward the floor, push through the front heel.', 'Back squat', 0.2],
  ['Split squat', 'Quads', 'lunge', 'dumbbell', 'w', 'Weight per dumbbell. Stay in the split stance, straight down and up.', 'Back squat', 0.2],
  ['Bulgarian split squat', 'Quads', 'lunge', 'dumbbell', 'w', 'Weight per dumbbell. Back foot on a bench, front shin vertical-ish, deep stretch.', 'Back squat', 0.2],
  ['Leg extension', 'Quads', 'kext', 'machine', 'w', 'Knee lined up with the machine pivot, squeeze 1 s at the top.'],
  ['Leg curl', 'Hamstrings', 'kflex', 'machine', 'w', 'Hips pressed down, curl to full contraction, slow return.'],
  ['Seated leg curl', 'Hamstrings', 'kflex', 'machine', 'w', 'Lean forward for a bigger stretch, curl fully.'],
  ['Nordic curl', 'Hamstrings', 'kflex', 'bodyweight', 'bw', 'Anchor the heels, lower as slowly as possible, push back up with the hands.'],
  ['Hip thrust', 'Glutes', 'glute', 'barbell', 'w', 'Upper back on a bench, chin tucked, drive hips up and squeeze 1 s.', 'Back squat', 1],
  ['Glute bridge', 'Glutes', 'glute', 'bodyweight', 'bw', 'On the floor, heels close, drive the hips up.'],
  ['Cable kickback', 'Glutes', 'glute', 'cable', 'w', 'Ankle strap, kick back and slightly out, do not arch the low back.'],
  ['Standing calf raise', 'Calves', 'calf', 'machine', 'w', 'Full stretch at the bottom with a 1 s pause, all the way up.'],
  ['Seated calf raise', 'Calves', 'calf', 'machine', 'w', 'Pause in the stretch, drive up through the big toe.'],
  ['Single-leg calf raise', 'Calves', 'calf', 'bodyweight', 'bw', 'On a step, one leg, full range.'],
  ['Biceps curl', 'Biceps', 'curl', 'dumbbell', 'w', 'Weight per dumbbell. Elbows at the sides, no swinging.'],
  ['Barbell curl', 'Biceps', 'curl', 'barbell', 'w', 'Elbows pinned, curl to the shoulders, 2 s down.'],
  ['Incline dumbbell curl', 'Biceps', 'curl', 'dumbbell', 'w', 'Weight per dumbbell. Bench at 45 degrees, arms hang behind the body for a stretch.'],
  ['Hammer curl', 'Biceps', 'curl', 'dumbbell', 'w', 'Weight per dumbbell. Thumbs up, curl across or straight up.'],
  ['Preacher curl', 'Biceps', 'curl', 'machine', 'w', 'Armpits on the pad, full stretch, do not bounce.'],
  ['Spider curl', 'Biceps', 'curl', 'dumbbell', 'w', 'Chest on an incline bench, arms hang straight down, squeeze at the top.'],
  ['Cable curl', 'Biceps', 'curl', 'cable', 'w', 'Elbows still, constant tension.'],
  ['Triceps pushdown', 'Triceps', 'tri', 'cable', 'w', 'Elbows pinned to the sides, push to full lockout.'],
  ['Overhead triceps extension', 'Triceps', 'tri', 'cable', 'w', 'Arms by the ears, lower behind the head to a deep stretch.'],
  ['Skull crusher', 'Triceps', 'tri', 'barbell', 'w', 'EZ bar to the forehead or just behind, elbows pointing up.'],
  ['Plank', 'Core', 'core', 'bodyweight', 'tm', 'Reps are seconds. Ribs down, glutes squeezed, straight line.'],
  ['Side plank', 'Core', 'core', 'bodyweight', 'tm', 'Reps are seconds. Hips high, one side at a time.'],
  ['Dead bug', 'Core', 'core', 'bodyweight', 'bw', 'Low back pressed down, extend opposite arm and leg slowly.'],
  ['Cable crunch', 'Core', 'core', 'cable', 'w', 'Kneeling, curl the ribs toward the hips, hips stay still.'],
  ['Hanging leg raise', 'Core', 'core', 'bodyweight', 'bw', 'Dead hang, curl the pelvis up, no swinging.'],
  ['Ab wheel rollout', 'Core', 'core', 'bodyweight', 'bw', 'Roll out with a flat back, pull back with the abs.'],
];
export interface LibEx {
  n: string;
  g: string;
  p: string;
  eq: string;
  k: Kind;
  cue: string;
  an?: string;
  ra?: number;
}
export const LIBX: Record<string, LibEx> = {};
for (const [n, g, p, eq, k, cue, an, ra] of R) LIBX[n] = { n, g, p, eq, k, cue, an, ra };
export const EQUIP = ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight'];
const low = (s: string) => s.toLowerCase();
export const libFind = (n: string): LibEx | undefined =>
  LIBX[n] || Object.values(LIBX).find((x) => low(x.n) === low(n || ''));

/** Alternatives for an exercise: same movement pattern, available equipment first, different equipment first. */
export function swaps(n: string, have: string[] = EQUIP): LibEx[] {
  const me = libFind(n);
  if (!me) return [];
  return Object.values(LIBX)
    .filter((x) => x.p === me.p && x.n !== me.n && have.includes(x.eq))
    .sort((a, b) => (a.eq === me.eq ? 1 : 0) - (b.eq === me.eq ? 1 : 0) || a.n.localeCompare(b.n))
    .slice(0, 6);
}

// ---------------------------------------------------------------------------------------------------------
// Import from Strong and Hevy (their CSV exports).
// ---------------------------------------------------------------------------------------------------------
export function parseCSV(text: string): string[][] {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '',
    sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',',
    rows: string[][] = [];
  let row: string[] = [],
    f = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f);
      f = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else f += c;
  }
  row.push(f);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}
const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');
export function parseDay(s: string): string {
  s = (s || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/);
  if (m && MON[low(m[2])]) return `${m[3]}-${pad(MON[low(m[2])])}-${pad(+m[1])}`;
  m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MON[low(m[1])]) return `${m[3]}-${pad(MON[low(m[1])])}-${pad(+m[2])}`;
  const t = Date.parse(s);
  if (isFinite(t)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return '';
}
const ALIAS: Record<string, string> = {
  squat: 'Back squat',
  'back squat': 'Back squat',
  'bent over row': 'Barbell row',
  'bent over row|barbell': 'Barbell row',
  'bent over row|dumbbell': 'Dumbbell row',
  'dumbbell row': 'Dumbbell row',
  'one arm dumbbell row': 'Dumbbell row',
  'bicep curl': 'Biceps curl',
  'bicep curl|barbell': 'Barbell curl',
  'biceps curl|barbell': 'Barbell curl',
  'bicep curl|cable': 'Cable curl',
  'triceps pushdown': 'Triceps pushdown',
  'tricep pushdown': 'Triceps pushdown',
  'triceps rope pushdown': 'Triceps pushdown',
  'lying leg curl': 'Leg curl',
  'leg curl': 'Leg curl',
  'seated leg curl': 'Seated leg curl',
  'pull up': 'Pull-up',
  'pull up|assisted': 'Assisted pull-up',
  'assisted pull up': 'Assisted pull-up',
  'chin up': 'Chin-up',
  'push up': 'Push-up',
  'overhead press': 'Overhead press',
  'overhead press|dumbbell': 'Dumbbell shoulder press',
  'shoulder press': 'Seated shoulder press',
  'shoulder press|machine': 'Machine shoulder press',
  'shoulder press|dumbbell': 'Dumbbell shoulder press',
  'seated overhead press|dumbbell': 'Seated shoulder press',
  'seated row': 'Seated cable row',
  'seated cable row': 'Seated cable row',
  'incline bench press': 'Incline bench press',
  'incline bench press|dumbbell': 'Incline dumbbell press',
  'incline press|dumbbell': 'Incline dumbbell press',
  'bench press|dumbbell': 'Dumbbell bench press',
  'bench press|smith machine': 'Smith flat press',
  'chest press|machine': 'Machine chest press',
  'chest fly': 'Dumbbell fly',
  'chest fly|dumbbell': 'Dumbbell fly',
  'chest fly|machine': 'Pec deck',
  'butterfly': 'Pec deck',
  'cable crossover': 'Cable crossover',
  'romanian deadlift|dumbbell': 'Dumbbell Romanian deadlift',
  skullcrusher: 'Skull crusher',
  'skull crusher': 'Skull crusher',
  'triceps extension': 'Overhead triceps extension',
  'overhead triceps extension': 'Overhead triceps extension',
  'triceps dip': 'Dip',
  'chest dip': 'Dip',
  'calf raise': 'Standing calf raise',
  'standing calf raise': 'Standing calf raise',
  'seated calf raise': 'Seated calf raise',
  'reverse fly': 'Rear delt fly',
  'rear delt reverse fly': 'Rear delt fly',
  'reverse fly|machine': 'Reverse pec deck',
  'lateral raise|cable': 'Cable lateral raise',
  'lateral raise|machine': 'Machine lateral raise',
  'goblet squat': 'Goblet squat',
  'squat|smith machine': 'Smith squat',
  'squat|dumbbell': 'Goblet squat',
  'lunge|dumbbell': 'Lunge',
  'walking lunge': 'Lunge',
  'bulgarian split squat': 'Bulgarian split squat',
  'hip thrust': 'Hip thrust',
  'glute bridge': 'Glute bridge',
  'crunch|cable': 'Cable crunch',
  'cable crunch': 'Cable crunch',
  'knee raise|hanging': 'Hanging leg raise',
  'hanging knee raise': 'Hanging leg raise',
  'shrug|barbell': 'Shrug',
  'shrug|dumbbell': 'Shrug',
  'lat pulldown|single arm': 'Lat pulldown',
  'pullover|dumbbell': 'Dumbbell pullover',
  't bar row': 'T-bar row',
  'clean': 'Power clean',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Daily's name for an exercise named the Strong or Hevy way, e.g. "Bench Press (Dumbbell)" -> "Dumbbell bench press". */
export function mapName(raw: string): string {
  const m = (raw || '').trim().match(/^(.*?)\s*(?:\(([^)]*)\))?\s*$/),
    base0 = low((m && m[1]) || raw).replace(/\s+-\s+.*$/, ''),
    base = base0.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(),
    eq = low((m && m[2]) || '').trim();
  const hit = ALIAS[base + '|' + eq] || (eq && /^(dumbbell|smith|machine|cable)/.test(eq) ? '' : ALIAS[base]);
  if (hit) return hit;
  const tries = eq === 'dumbbell' ? ['dumbbell ' + base, base] : eq.startsWith('cable') ? [base, 'cable ' + base] : eq.startsWith('machine') ? [base, 'machine ' + base] : eq.startsWith('smith') ? ['smith ' + base] : [base];
  for (const t of tries) {
    const f = libFind(t);
    if (f) return f.n;
  }
  if (ALIAS[base]) return ALIAS[base];
  const pre = eq === 'dumbbell' || eq === 'kettlebell' || eq.startsWith('smith') || eq === 'band' ? (eq.startsWith('smith') ? 'smith' : eq) + ' ' : '';
  return cap((pre + base).trim()) || raw;
}

export interface Imported {
  src: 'Strong' | 'Hevy';
  days: Record<string, { name: string; sets: Record<string, any[]> }>;
  names: Record<string, string>; // original -> Daily name
  timed: string[]; // Daily names logged as durations
  sets: number;
  unit: string; // unit the weights were converted to
  assumed: boolean; // true when the file did not say its unit
}
/** Reads a Strong or Hevy CSV export into day logs. `unit` is Daily's unit; weights are converted to it. */
export function importCSV(text: string, unit: string): Imported | string {
  const rows = parseCSV(text);
  if (rows.length < 2) return 'This file has no workouts in it.';
  const H = rows[0].map((h) => low(h.trim())),
    col = (...names: string[]) => H.findIndex((h) => names.includes(h)),
    hevy = col('exercise_title') >= 0,
    strong = col('exercise name') >= 0;
  if (!hevy && !strong) return 'This does not look like a Strong or Hevy export (CSV).';
  const toKg = 0.45359237,
    conv = (w: number, from: string) => (from === unit || !from ? w : unit === 'kg' ? w * toKg : w / toKg),
    rd = (w: number) => (unit === 'kg' ? Math.round(w * 4) / 4 : Math.round(w * 2) / 2);
  const out: Imported = { src: hevy ? 'Hevy' : 'Strong', days: {}, names: {}, timed: [], sets: 0, unit, assumed: false };
  const cDate = hevy ? col('start_time') : col('date'),
    cWork = hevy ? col('title') : col('workout name'),
    cEx = hevy ? col('exercise_title') : col('exercise name'),
    cOrd = hevy ? col('set_type') : col('set order'),
    cR = col('reps'),
    cSec = hevy ? col('duration_seconds') : col('seconds'),
    cRpe = col('rpe'),
    cKg = col('weight_kg'),
    cLb = col('weight_lbs'),
    cW = col('weight'),
    cU = col('weight unit', 'unit');
  if (cDate < 0 || cEx < 0) return 'The file is missing its date or exercise columns.';
  if (!hevy && cU < 0) out.assumed = true;
  const timed = new Set<string>();
  for (const r of rows.slice(1)) {
    const day = parseDay(r[cDate]),
      raw = (r[cEx] || '').trim();
    if (!day || !raw) continue;
    let w = 0,
      from = '';
    if (cKg >= 0 && r[cKg] !== '') (w = +r[cKg]), (from = 'kg');
    else if (cLb >= 0 && r[cLb] !== '') (w = +r[cLb]), (from = 'lb');
    else if (cW >= 0) {
      w = +String(r[cW]).replace(',', '.') || 0;
      const u = cU >= 0 ? low(r[cU] || '') : '';
      from = /kg/.test(u) ? 'kg' : /lb/.test(u) ? 'lb' : unit;
    }
    w = rd(conv(w || 0, from));
    let reps = +r[cR] || 0;
    const sec = cSec >= 0 ? +r[cSec] || 0 : 0,
      n = (out.names[raw] = out.names[raw] || mapName(raw));
    if (!reps && sec > 0) {
      reps = Math.round(sec);
      timed.add(n);
    }
    if (!reps) continue;
    const ord = low(String(cOrd >= 0 ? r[cOrd] : '')),
      s: any = { w, r: reps };
    if (ord === 'w' || ord === 'warmup' || ord === 'warm up') s.t = 'W';
    else if (ord === 'd' || ord === 'dropset' || ord === 'drop set') s.t = 'D';
    else if (ord === 'f' || ord === 'failure') s.t = 'F';
    const rpe = cRpe >= 0 ? parseFloat(String(r[cRpe]).replace(',', '.')) : NaN;
    if (rpe >= 5 && rpe <= 10) s.q = Math.max(0, Math.min(5, Math.round(10 - rpe)));
    const D = (out.days[day] = out.days[day] || { name: (cWork >= 0 && r[cWork]) || '', sets: {} });
    (D.sets[n] = D.sets[n] || []).push(s);
    out.sets++;
  }
  out.timed = Array.from(timed);
  if (!out.sets) return 'No sets with reps were found in this file.';
  return out;
}
