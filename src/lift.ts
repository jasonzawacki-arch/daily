import liftCss from './lift.css';
import { checkProgram, programData, programFile } from './regcheck.js';
import TEMPLATES from './programs.json';
const SR = document.getElementById('hl').attachShadow({ mode: 'open' });
SR.innerHTML =
  '<style>' + liftCss + '</style><div id=app></div><div id=tm hidden></div><div id=ut hidden></div><input type=file id=pgf class=fi tabindex=-1 aria-hidden=true>';

const $ = (s) => SR.querySelector(s),
  esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const LIB = {
  'Bench press': 'Chest',
  'Incline dumbbell press': 'Chest',
  'Dumbbell fly': 'Chest',
  'Cable fly': 'Chest',
  'Push-up': 'Chest',
  'Seated shoulder press': 'Shoulders',
  'Overhead press': 'Shoulders',
  'Lateral raise': 'Shoulders',
  'Rear delt fly': 'Shoulders',
  'Face pull': 'Shoulders',
  'Triceps pushdown': 'Triceps',
  'Skull crusher': 'Triceps',
  Dip: 'Triceps',
  'Lat pulldown': 'Back',
  'Pull-up': 'Back',
  'Barbell row': 'Back',
  'Seated cable row': 'Back',
  'Dumbbell row': 'Back',
  Deadlift: 'Back',
  'Biceps curl': 'Biceps',
  'Hammer curl': 'Biceps',
  'Preacher curl': 'Biceps',
  'Back squat': 'Quads',
  'Front squat': 'Quads',
  'Leg press': 'Quads',
  'Leg extension': 'Quads',
  Lunge: 'Quads',
  'Romanian deadlift': 'Hamstrings',
  'Leg curl': 'Hamstrings',
  'Hip thrust': 'Glutes',
  'Standing calf raise': 'Calves',
  'Seated calf raise': 'Calves',
  Plank: 'Core',
  'Cable crunch': 'Core',
  'Hanging leg raise': 'Core',
};
const GR = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Other',
];
const DEF = {
  days: [
    {
      n: 'Push',
      ex: [
        ['Bench press', 4, '6-8'],
        ['Incline dumbbell press', 3, '8-10'],
        ['Seated shoulder press', 3, '8-10'],
        ['Lateral raise', 3, '12-15'],
        ['Triceps pushdown', 3, '10-12'],
      ],
    },
    {
      n: 'Pull',
      ex: [
        ['Lat pulldown', 4, '6-8'],
        ['Barbell row', 4, '8-10'],
        ['Seated cable row', 3, '10-12'],
        ['Rear delt fly', 3, '12-15'],
        ['Biceps curl', 3, '10-12'],
      ],
    },
    {
      n: 'Legs',
      ex: [
        ['Back squat', 4, '5-8'],
        ['Romanian deadlift', 3, '8-10'],
        ['Leg press', 3, '10-12'],
        ['Leg curl', 3, '10-12'],
        ['Standing calf raise', 4, '12-15'],
      ],
    },
  ].map((d) => ({
    n: d.n,
    ex: d.ex.map((e) => ({ n: e[0], s: e[1], r: e[2], t: '', g: LIB[e[0]] || 'Other' })),
  })),
};
// Program templates are data (src/programs.json); the first is the Dorian Yates HIT routine.
const TPL: any[] = TEMPLATES as any,
  DY = programData(TPL[0]);
let tplSel = 0,
  schMsg = '';
const U = () => cfg().u || 'lb';
const plates = (w) => {
  const kg = U() === 'kg',
    bar = kg ? 20 : 45,
    P = kg ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
  let r = (w - bar) / 2;
  if (!(r > 0)) return '';
  const o = [];
  P.forEach((p) => {
    while (r >= p - 1e-9) {
      o.push(p);
      r -= p;
    }
  });
  return o.length ? o.join(' + ') + ' per side' + (r > 0.01 ? ' (+' + r.toFixed(2) + ' left)' : '') : '';
};
let wun = null,
  xnN: string | null = null,
  xh = null,
  hxN: string | null = null,
  swp = null,
  lastP = null,
  uto = 0;
function un(P, m?) {
  lastP = P;
  const t = $('#ut');
  t.innerHTML = (m || 'Exercise deleted') + ' <button data-a=undo>Undo</button>';
  t.hidden = false;
  clearTimeout(uto);
  uto = setTimeout(() => {
    t.hidden = true;
  }, 6000);
}
let pgPend: any = null;
// Load program file: the input sits outside #app so a re-render while the picker is open cannot drop the pick.
async function pgPicked() {
  const el = $('#pgf') as HTMLInputElement,
    f = el.files && el.files[0];
  if (!f) return;
  el.value = '';
  let o: any = null;
  try {
    o = JSON.parse(await f.text());
  } catch (x) {}
  if (o && o.format === 'daily-regimen' && o.program) o = o.program; // a regimen file that carries a program
  const why = o ? checkProgram(o) : 'This file is not valid JSON.',
    t = $('#ut');
  pgPend = why ? null : o;
  t.innerHTML = why
    ? esc('Program not loaded. ' + why)
    : esc(`Found ${o.name || 'a program'} (${o.days.filter((d) => !d.off).length} training days).`) + ' <button data-pa=1>Replace</button>';
  t.hidden = false;
  clearTimeout(uto);
  uto = setTimeout(() => {
    t.hidden = true;
    pgPend = null;
  }, 15000);
}
($('#pgf') as HTMLInputElement).addEventListener('change', pgPicked);
window.addEventListener('focus', () => setTimeout(pgPicked, 400));
SR.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('#ut button[data-pa]')) {
    if (!pgPend) return;
    un(cl(prog()), 'Program replaced');
    put('prog', programData(pgPend));
    pgPend = null;
    render();
    return;
  }
  if ((e.target as HTMLElement).closest('#ut button') && lastP) {
    put('prog', lastP);
    lastP = null;
    $('#ut').hidden = true;
    render();
  }
});
const IC = {
  today: '<svg viewBox="0 0 24 24"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
  prog: '<svg viewBox="0 0 24 24"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  sw: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  hist: '<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
};
const spark = (a) =>
  a.length < 2
    ? ''
    : `<svg viewBox="0 0 180 40" preserveAspectRatio="none" class=sp><polyline points="${a.map((v, i) => ((i * 180) / (a.length - 1)).toFixed(1) + ',' + (36 - ((v - Math.min(...a)) / (Math.max(...a) - Math.min(...a) || 1)) * 32).toFixed(1)).join(' ')}"/></svg>`;
const LS = 'wl:',
  q = {},
  cl = (x) => JSON.parse(JSON.stringify(x));
let col = null,
  mem: Record<string, any> = {},
  mode = 'device',
  tab = 'today',
  tm = null;
const iso = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
    return z.toISOString().slice(0, 10);
  },
  addD = (s, n) => {
    const d = new Date(s + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  },
  days = (a, b) => Math.round((+new Date(b + 'T12:00:00') - +new Date(a + 'T12:00:00')) / 864e5);
const fmt = (s) =>
  new Date(s + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
let date = iso(new Date());
async function boot() {
  try {
    await DBREADY;
    const a = await IDB.all();
    delete a._migrated;
    Object.assign(mem, a);
    mode = 'local';
  } catch (e) {
    mode = 'device';
  }
  // Defaults count as never changed (time 0), so syncing a new device never overwrites real data with them.
  if (!mem.wcfg) {
    put('wcfg', { start: date });
    IDB.mark && IDB.mark('wcfg', 0);
  }
  if (!mem.prog || JSON.stringify(mem.prog) === JSON.stringify(DEF)) {
    put('prog', JSON.parse(JSON.stringify(DY)));
    IDB.mark && IDB.mark('prog', 0);
  }
}
function put(k, v) {
  mem[k] = v;
  try {
    window.Cloud && window.Cloud.touch();
  } catch (e) {}
  try {
    IDB.set(k, v).catch(() => {
      mode = 'unsaved';
    });
  } catch (e) {
    mode = 'unsaved';
  }
}
const prog = () => mem.prog || DEF,
  cfg = () => mem.wcfg || { start: date },
  wd = (s) => mem['w-' + s] || {};
function dayIdx(s) {
  const d = wd(s);
  if (d.k != null) return d.k;
  if (WEEK()) return (new Date(s + 'T12:00:00').getDay() + 6) % 7; // Monday = 0
  const ks = logs().filter((k) => k.slice(2) < s && mem[k].dn);
  if (ks.length) return ((mem[ks[ks.length - 1]].k ?? 0) + 1) % CY();
  return ((days(cfg().start, s) % CY()) + CY()) % CY();
}
const WEEK = () => prog().sched === 'week' && prog().days.length === 7,
  WDS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ON = () => prog().days.length,
  // A program may list its own rest days (off: true); otherwise one OFF day follows the last day.
  hasOff = () => prog().days.some((d) => d.off),
  CY = () => (WEEK() ? 7 : ON() + (hasOff() ? 0 : 1)),
  isOff = (k) => k >= ON() || !!(prog().days[k] || {}).off,
  nm = (k) =>
    WEEK()
      ? WDS[k].slice(0, 3)
      : isOff(k)
      ? 'OFF'
      : 'ON ' +
        (prog()
          .days.slice(0, k)
          .filter((d) => !d.off).length +
          1),
  title = (k) =>
    isOff(k)
      ? k < ON() && prog().days[k].n !== 'Rest'
        ? prog().days[k].n
        : 'Recovery day'
      : (prog().days[k] || { n: 'Day' }).n;
const logs = () =>
    Object.keys(mem)
      .filter((k) => k.startsWith('w-'))
      .sort(),
  e1 = (s) => (s && s.w > 0 && s.r > 0 && s.t !== 'W' && s.t !== 'R' ? s.w * (1 + s.r / 30) : 0),
  all = (d) =>
    Object.values(d.sets || {})
      .flat()
      .filter((s) => s && s.w && s.r && s.t !== 'W');
function lastFor(n, b) {
  for (const k of logs()
    .filter((k) => k.slice(2) < b)
    .reverse()) {
    const a = ((mem[k].sets || {})[n] || []).map((x) => x || {});
    if (a.some((x) => x.w && x.r)) return { date: k.slice(2), sets: a };
  }
  return null;
}
function best(n, b) {
  let m = 0;
  logs()
    .filter((k) => k.slice(2) < b)
    .forEach((k) => ((mem[k].sets || {})[n] || []).forEach((s) => (m = Math.max(m, e1(s)))));
  return m;
}
const vol = (d) => all(d).reduce((t, s) => t + s.w * s.r, 0),
  volT = (d) => {
    const a = all(d);
    const n = a.filter((x) => x.t !== 'R').length;
    return a.length ? `${Math.round(vol(d)).toLocaleString()} ${U()} · ${n} sets` : '';
  };
// Per-exercise session note and pain flag, kept in the day log as xn / xp.
const exNote = (n: string, s: string) => ((wd(s).xn || {})[n] as string) || '',
  exPain = (n: string, s: string) => !!(wd(s).xp || {})[n];
function exMeta(e, d, L) {
  const n = e.n,
    note = ((d.xn || {})[n] as string) || '',
    pain = !!(d.xp || {})[n],
    lastNote = L ? exNote(n, L.date) : '',
    lastPain = L ? exPain(n, L.date) : false;
  return `${lastPain ? `<div class=al>Pain was flagged on ${esc(n)} last session (${L.date.slice(5)}). Suggested weights are lower. Stop if it comes back.</div>` : ''}${lastNote ? `<p class=sm>Last note (${L.date.slice(5)}): ${esc(lastNote)}</p>` : ''}${xnN === n ? `<textarea rows=2 data-xn="${esc(n)}" placeholder="Cue, form note, substitution">${esc(note)}</textarea>` : note ? `<p class=sm>Note: ${esc(note)}</p>` : ''}<div class=chips style="margin:4px 0"><button data-a=xnt data-v="${esc(n)}">${xnN === n ? 'Done' : note ? 'Edit note' : 'Add note'}</button><button data-a=xp data-v="${esc(n)}" class="${pain ? 'on' : ''}" aria-pressed=${pain}>${pain ? 'Pain flagged' : 'Flag pain'}</button></div>`;
}
function exCard(e, d) {
  const L = lastFor(e.n, date),
    arr = ((d.sets || {})[e.n] || []).map((x) => x || {}),
    rows = d.rows && d.rows[e.n] != null ? d.rows[e.n] : Math.max(e.s + (e.rp ? 1 : 0), arr.length),
    pb = best(e.n, date),
    pl = plates(
      Math.max(0, ...arr.map((s) => s.w || 0)) || (L ? Math.max(0, ...L.sets.map((s) => s.w || 0)) : 0),
    ),
    top = parseInt(String(e.r).split('-').pop()),
    isPR = pb > 0 && arr.some((s) => e1(s) > pb);
  const up = L && L.sets.length >= e.s && L.sets.slice(0, e.s).every((x) => x.w && x.r >= top);
  let h = `<div class=swr><button class=sdel data-a=rd data-v="${esc(e.o || e.n)}">Delete</button><div class="card swb" data-sw><h3>${esc(e.n)}<span class=tg>${e.s} x ${esc(e.r)}${e.rp ? ' + RP' : ''}</span>${e.ss ? '<span class=pr style="background:var(--ac)">SUPERSET</span>' : ''}<button class=lnk data-a=sw data-v="${esc(e.o || e.n)}" style="margin-left:auto;padding:0">${e.o ? 'Swapped' : 'Swap'}</button>${isPR ? '<span class=pr>PR</span>' : ''}</h3>`;
  if (e.wu) h += `<p class=sm><b>Warm-up:</b> ${esc(e.wu)}</p>`;
  if (e.t) h += `<p class=sm>${esc(e.t)}</p>`;
  if (pl) h += `<p class=sm>Plates: ${pl}</p>`;
  h += exMeta(e, d, L);
  if (wun === e.n)
    h += `<div class=hint>Enter your first working weight and I will build the ramp-up sets.<div class=g3 style="grid-template-columns:1fr auto;margin-top:8px"><input type=number inputmode=decimal id=wuw placeholder="Working weight (${U()})"><button class=btn data-a=wu data-v="${esc(e.n)}">Build</button></div></div>`;
  if (xh === e.n) h += xhPanel(e.n);
  if (swp === (e.o || e.n))
    h += `<div class=g3 style="grid-template-columns:1fr auto"><input type=text id=swn placeholder="Alternative for today (blank to reset)" value="${esc(e.o ? e.n : '')}"><button class=btn data-a=sg data-v="${esc(e.o || e.n)}">Use</button></div>`;
  h += `<p class=sm>${
    L
      ? 'Last (' +
        L.date.slice(5) +
        '): ' +
        L.sets
          .filter((x) => x.w && x.r && x.t !== 'W')
          .map((x) => (x.t === 'R' ? '+' + x.r : x.w + 'x' + x.r))
          .join(' ')
          .replace(/ \+/g, '+')
      : 'No previous session logged'
  }</p>`;
  {
    const g = sug(e, L);
    if (g)
      h += `<div class=hint>${g.t} <button class=lnk data-a=ap data-v="${esc(e.o || e.n)}">Apply weights</button></div>`;
  }
  const nIdx = (i: number) => i - arr.slice(0, i).filter((x) => x.t === 'W').length;
  for (let i = 0; i < rows; i++) {
    const s = arr[i] || {},
      p = (L && L.sets[i]) || {},
      key = esc(e.n) + '|' + i;
    h += `<div class=sr><b class="${s.w && s.r ? 'ok' : ''}">${s.t === 'W' ? 'W' : e.rp && nIdx(i) === e.s ? 'RP' : nIdx(i) + 1}</b><input type=number inputmode=decimal step=.5 data-s="${key}|w" placeholder="${(sug(e, L) || {}).w || p.w || U()}" value="${s.w ?? ''}"><input type=number inputmode=numeric data-s="${key}|r" placeholder="${p.r || 'reps'}" value="${s.r ?? ''}"><select class=rir data-s="${key}|q" aria-label="Reps in reserve"><option value="">RIR</option>${[0, 1, 2, 3, 4].map((n) => `<option value=${n} ${s.q === n ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="fl ${s.t || s.f ? 'on' : ''}" data-a=f data-v="${key}" aria-label="Set type: failure, warm-up, or drop">${s.t || (s.f ? 'F' : '-')}</button><button class=x data-a=rm data-v="${key}" aria-label="Remove set">&times;</button></div>`;
  }
  return (
    h +
    `<button class=lnk data-a=xh data-v="${esc(e.n)}">History</button> <button class=lnk data-a=wu data-v="${esc(e.n)}">${e.wu || prog().hit ? 'Feeder sets' : 'Add warm-ups'}</button> ${L ? '<button class=lnk data-a=fl data-v="' + esc(e.n) + '">Fill from last session</button> ' : ''}<button class=lnk data-a=as data-v="${esc(e.n)}">Add set</button> <button class=lnk data-a=rd data-v="${esc(e.o || e.n)}">Remove exercise</button></div></div>`
  );
}
const vx = (k, ph) =>
    `<input type=number inputmode=decimal data-x=${k} placeholder="${ph}" value="${P_.get(date, k) ?? ''}">`,
  vi = (d, k, ph) =>
    `<input type=number inputmode=decimal data-k=${k} placeholder="${ph}" value="${d[k] ?? ''}">`;
function readyCard(d, off) {
  return `<div class=card><h3>${off ? 'Recovery log' : 'Readiness and notes'}</h3>${off ? `<div class=g3><div><label class=f>Steps</label>${vi(d, 'st', '#')}</div><div><label class=f>Walk (min)</label>${vi(d, 'wk', 'min')}</div><div><label class=f>Mobility (min)</label>${vi(d, 'mb', 'min')}</div></div>` : ''}
<div class=g3><div><label class=f>Sleep (h)</label>${vx('sl', 'h')}</div><div><label class=f>Resting HR</label>${vx('hr', 'bpm')}</div><div><label class=f>Body (${U()})</label>${vx('wt', U())}</div></div><label class=f>Soreness (1 fresh, 5 very sore)</label><div class=en>${[1, 2, 3, 4, 5].map((n) => `<button data-a=so data-v=${n} class="${d.so === n ? 'on' : ''}">${n}</button>`).join('')}</div>
<label class=f>${off ? 'Joints and tendons' : 'Session notes'}</label><textarea rows=3 data-k=nt>${esc(d.nt || '')}</textarea>${P_.get(date, 'sl') && P_.get(date, 'sl') < 5 ? '<div class=hint style="margin-top:10px">Short sleep. Consider trimming volume and stopping short of failure next ON day.</div>' : ''}</div>`;
}
function todayV() {
  const k = dayIdx(date),
    d = wd(date),
    c = cfg(),
    bl = c.bl || 5,
    wi = Math.floor(days(c.dl || c.start, date) / 7) % (bl + 1),
    dlw = wi === bl;
  let h = '';
  h += dlw
    ? '<div class=hint>Deload week: about half the sets, stop short of failure, keep loads moderate. Targets are halved below. <button class=lnk data-a=dl>Restart block</button></div>'
    : `<div class=sm>Training week ${wi + 1} of ${bl}, then a deload week. <button class=lnk data-a=dl>I deloaded today</button></div>`;
  if (isOff(k))
    h += `<div class=card><h3>Recovery day</h3><p class=sm>Easy walking, mobility, and tendon care. Log it below so rest days count.</p></div>`;
  else
    prog().days[k].ex.forEach((e) => {
      const w = (d.sw || {})[e.n];
      h += exCard({ ...e, dl: dlw, s: dlw ? Math.ceil(e.s / 2) : e.s, ...(w ? { n: w, o: e.n } : {}) }, d);
    });
  return (
    (isOff(k) ? '' : vbarL()) +
    lwarnHTML() +
    rdyCard(d) +
    (isOff(k)
      ? ''
      : '<button class=lnk data-a=apall style="margin:6px 0">Apply suggested weights to all</button> <button class=lnk data-a=flall style="margin:6px 0">Copy last session</button>') +
    h +
    cardioCard(d) +
    readyCard(d, isOff(k))
  );
}
function progV() {
  const P = prog();
  let h =
    '<datalist id=exl>' +
    Object.keys(LIB)
      .map((n) => '<option>' + esc(n) + '</option>')
      .join('') +
    '</datalist><div class=hint>Your program: edit days and exercises here. Rep ranges drive the "add weight" hints. Swipe a row left to delete it. RP marks a rest-pause set after the working set; log it as weight and the extra reps.</div>' +
    `<div class=card><h3>Start from a template</h3><select id=tpl aria-label="Template">${TPL.map((t, i) => `<option value=${i} ${i === tplSel ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><p class=sm>${esc(TPL[tplSel].about || '')} ${TPL[tplSel].sched === 'week' ? 'Fixed weekdays.' : 'Rotating cycle.'}</p><button class=btn data-a=tpu>Use this template</button> <button class=btn data-a=tps>Save as file</button><p class=sm>Using a template replaces the current program, with Undo; then change anything below. Save as file to edit it on a computer and load it back, or to put it in a regimen file.</p></div>`;
  P.days.forEach((D, i) => {
    const mv = `<button class=mv data-a=dmu data-v=${i} aria-label="Move day up" ${i ? '' : 'disabled'}>&#9650;</button><button class=mv data-a=dmd data-v=${i} aria-label="Move day down" ${i < P.days.length - 1 ? '' : 'disabled'}>&#9660;</button>`;
    h += `<div class=card><input type=text data-p="${i}|n" value="${esc(D.n)}" aria-label="Day name"><div class=exh><span class=sm>${WEEK() ? WDS[i] : nm(i)}${D.off ? ' · rest day' : ''}</span><i style="flex:1"></i><button class=lnk data-a=doff data-v=${i}>${D.off ? 'Make it a training day' : 'Make it a rest day'}</button>${mv}</div>`;
    if (D.off) {
      h += '<p class=sm>Rest day. Nothing to log except recovery.</p></div>';
      return;
    }
    D.ex.forEach(
      (e, j) =>
        (h += `<div class=swr><button class=sdel data-a=re data-v="${i}|${j}">Delete</button><div class=swb data-sw><div class=exh><span>${j + 1}</span><button class="mv ${e.ss ? 'on' : ''}" data-a=ss data-v="${i}|${j}" aria-label="Superset with next exercise">SS</button><i style="flex:1"></i><button class=lnk data-a=re data-v="${i}|${j}">Delete</button><button class=mv data-a=mu data-v="${i}|${j}" aria-label="Move up" ${j ? '' : 'disabled'}>&#9650;</button><button class=mv data-a=md data-v="${i}|${j}" aria-label="Move down" ${j < D.ex.length - 1 ? '' : 'disabled'}>&#9660;</button></div><div class=pe><input type=text list=exl data-p="${i}|${j}|n" value="${esc(e.n)}"><input type=number data-p="${i}|${j}|s" value="${e.s}"><input type=text data-p="${i}|${j}|r" value="${esc(e.r)}"></div><div class=g3 style="grid-template-columns:1fr 110px"><input type=text data-p="${i}|${j}|t" placeholder="Note (tempo, cues)" value="${esc(e.t || '')}" style="font-size:14px;padding:8px"><select data-p="${i}|${j}|g" style="padding:8px;font-size:14px">${GR.map((g) => `<option ${(e.g || 'Other') === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div></div></div>`),
    );
    h += `<button class=lnk data-a=ae data-v=${i}>Add exercise</button></div>`;
  });
  const c = cfg();
  return (
    h +
    `<div class=card><h3>Program file</h3><p class=sm>${P.name ? '<b>' + esc(P.name) + '</b>. ' : ''}${P.about ? esc(P.about) + ' ' : ''}Save this program as a file to keep, edit or share, or load another one. Loading replaces the current program, with Undo.</p><button class=btn data-a=pgs>Save program file</button> <label class=btn for=pgf role=button style="display:inline-block;cursor:pointer">Load program file</label></div><div class=card><h3>Import a program</h3><p class=sm>Paste one day per line ending in a colon, then exercises like Bench press 4x6-8.</p><textarea id=imp rows=6 placeholder="Push:&#10;Bench press 4x6-8&#10;Lateral raise 3x12-15"></textarea><button class=btn data-a=imp style="margin-top:8px">Import (replaces program)</button></div><div class=card><h3>Schedule</h3><select id=sch aria-label="Schedule"><option value=cycle ${WEEK() ? '' : 'selected'}>Rotating cycle</option><option value=week ${WEEK() ? 'selected' : ''}>Fixed weekdays (Mon to Sun)</option></select><p class=sm>${
      WEEK()
        ? 'Each day above is a weekday, Monday first. Make days rest days to set your week, and use the arrows to move a workout to another day. Training on a different day? Pick the day at the top of Today.'
        : `${P.days.filter((d) => !d.off).length} training days${hasOff() ? ' and ' + P.days.filter((d) => d.off).length + ' rest days' : ', then 1 rest day'}, repeating. The next day follows your last completed day, so skipping a day doesn't shift the cycle. <button class=lnk data-a=ad>Add day</button> <button class=lnk data-a=ad data-v=off>Add rest day</button> <button class=lnk data-a=rmd>Remove last day</button>`
    }${schMsg ? ' <b>' + esc(schMsg) + '</b>' : ''}</p><p class=sm>Last deload: ${c.dl || 'none logged'}.</p><label class=f>Training weeks before a deload</label><select data-cf=bl>${[3, 4, 5, 6, 8].map((n) => `<option ${(cfg().bl || 5) === n ? 'selected' : ''}>${n}</option>`).join('')}</select><label class=f>Readiness strictness</label><select data-cf=rg>${[
      [0.7, 'Lenient'],
      [1, 'Normal'],
      [1.3, 'Strict'],
    ]
      .map(([v, t]) => `<option value=${v} ${(cfg().rg || 1) === v ? 'selected' : ''}>${t}</option>`)
      .join(
        '',
      )}</select><label class=f>Rest timer after each set</label><div class=g3 style="grid-template-columns:1fr 1fr"><select data-cf=auto><option value=1 ${cfg().auto !== 0 ? 'selected' : ''}>Auto-start on</option><option value=0 ${cfg().auto === 0 ? 'selected' : ''}>Auto-start off</option></select><select data-cf=rs>${[60, 90, 120, 180].map((s) => `<option value=${s} ${(cfg().rs || 90) === s ? 'selected' : ''}>${s} sec</option>`).join('')}</select></div><label class=f>Units (changing converts logged weights)</label><select data-cu=1><option value=lb ${U() === 'lb' ? 'selected' : ''}>lb</option><option value=kg ${U() === 'kg' ? 'selected' : ''}>kg</option></select><button class=btn data-a=csv style="margin-top:10px">Export sets (CSV)</button><p class=sm>${mode === 'local' ? 'Saved in the local database on this device. Use Backup to move it.' : 'Saved on this device only.'}</p></div>`
  );
}
function sug(e, L) {
  if (!L) return null;
  const ws = L.sets.filter((x) => x && x.w && x.r && x.t !== 'W' && x.t !== 'R');
  if (!ws.length) return null;
  const [lo, hi] = String(e.r).split('-').map(Number),
    top = hi || lo,
    low = lo,
    mw = Math.max(...ws.map((x) => x.w)),
    weak = ws.filter((x) => x.r < low).length,
    gr = e.g || LIB[e.n] || 'Other',
    lower = ['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(gr),
    st = U() === 'kg' ? 2.5 : 5,
    hitP = !!prog().hit,
    heavy =
      /press|row|pulldown|deadlift|squat/i.test(e.n) &&
      !/calf|adductor|fly|extension|curl|raise|lateral|crunch|straight-arm/i.test(e.n),
    inc = hitP ? (heavy ? st : U() === 'kg' ? 1.25 : 2.5) : lower ? st * 2 : st,
    rd = (x) => Math.round(x / st) * st,
    hit = ws.slice(0, Math.max(e.s, 1)).every((x) => x.r >= top);
  const pn = exPain(e.n, L.date);
  let w, t;
  if (pn && !e.dl) {
    w = rd(mw * 0.9);
    t = `Pain was flagged last time. Try ${w} ${U()} (about 90%) with a slower tempo, and stop if it returns.`;
  } else if (e.dl) {
    w = rd(mw * 0.9);
    t = `Deload: ${w} ${U()} for ${low}-${top} reps (about 90% of last load, stop short of failure).`;
  } else if (hit) {
    w = mw + inc;
    t = hitP
      ? `You hit ${top} reps on the first set last time. Add ${inc} ${U()}: next ${w} ${U()}, starting near ${low} reps.`
      : `Hit ${top} reps on every set last time. Next: ${w} ${U()}, starting near ${low} reps.`;
  } else if (weak >= Math.ceil(ws.length / 2)) {
    w = rd(mw * 0.95);
    t = `Fell below ${low} reps on most sets. Back off to ${w} ${U()}.`;
  } else {
    w = mw;
    t = `Stay at ${w} ${U()} and aim for ${Math.min(top, Math.max(...ws.map((x) => x.r)) + 1)} reps on your top set.`;
  }
  if (!e.dl) {
    const m = rm();
    if (m < 1) {
      w = rd(w * m);
      t += ' Adjusted down for low readiness.';
    }
  }
  return { w, t };
}
function applyW(d, v) {
  const L = lastFor(v, date),
    t = prog().days[dayIdx(date)].ex.find((x) => x.n === v) || {},
    c = cfg(),
    bl = c.bl || 5,
    dl = Math.floor(days(c.dl || c.start, date) / 7) % (bl + 1) === bl,
    g = sug({ ...t, n: v, dl, s: t.s || 3 }, L);
  if (!g) return false;
  if (d.k == null) d.k = dayIdx(date);
  d.sets = d.sets || {};
  const a2 = (d.sets[v] = (d.sets[v] || []).map((x) => x || {})),
    n =
      d.rows && d.rows[v] != null
        ? d.rows[v]
        : Math.max(dl ? Math.ceil((t.s || 3) / 2) : t.s || 3, a2.length);
  while (a2.length < n) a2.push({});
  a2.forEach((s) => {
    if (s.t !== 'W' && !s.w) s.w = g.w;
  });
  return true;
}
function rScore() {
  const d = wd(date),
    sl = P_.get(date, 'sl'),
    hr = P_.get(date, 'hr'),
    sy = P_.get(date, 'sy') || [],
    aw = P_.get(date, 'aw'),
    so = d.so,
    m = cfg().rg || 1,
    why = [],
    bad = ['Dizziness', 'Palpitations', 'Bruising or bleeding'];
  let s = 100,
    has = false;
  const pen = (n, t) => {
    s -= n * m;
    why.push(t);
  };
  if (sl) {
    has = true;
    if (sl < 5) pen(30, 'Sleep under 5 h');
    else if (sl < 6) pen(15, 'Sleep under 6 h');
    else if (sl < 7) pen(5, 'Sleep under 7 h');
  }
  const hh = P_.hist('hr', 15).slice(0, -1);
  if (hr && hh.length >= 3) {
    has = true;
    const b = hh.slice().sort((a, c) => a - c)[Math.floor(hh.length / 2)];
    if (hr - b >= 7) pen(15, 'Resting HR ' + (hr - b) + ' above your usual');
    else if (hr - b >= 4) pen(8, 'Resting HR ' + (hr - b) + ' above your usual');
  }
  if (so) {
    has = true;
    if (so >= 5) pen(20, 'Very sore');
    else if (so === 4) pen(10, 'Sore');
  }
  if (aw >= 3) {
    has = true;
    pen(8, 'Woke 3 or more times overnight');
  }
  if (sy.some((x) => bad.includes(x))) {
    has = true;
    pen(25, 'Symptom logged: ' + sy.filter((x) => bad.includes(x)).join(', '));
  } else if (sy.length) {
    has = true;
    pen(Math.min(20, sy.length * 8), 'Symptoms logged');
  }
  return { s: Math.max(0, Math.round(s)), has, why };
}
const rm = () => {
  const r = rScore();
  return !r.has || r.s >= 75 ? 1 : r.s >= 50 ? 0.95 : 0.9;
};
function rdyCard(d) {
  const r = rScore();
  if (!r.has)
    return `<p class=sm style="margin:6px 4px">Readiness score appears once you log sleep, resting HR or soreness below.</p>`;
  const a =
    r.s >= 75
      ? 'Train as planned.'
      : r.s >= 50
        ? 'Trim volume about 20% and stop 1 to 2 reps short of failure. Suggested weights are 5% lower.'
        : 'Go easy: recovery work or a light session. Suggested weights are 10% lower.';
  return `<div class=card><h3>Readiness score <span class=tg>${r.s}/100</span></h3><div class=mvb><i style="width:${r.s}%;background:${r.s >= 75 ? 'var(--dn)' : r.s >= 50 ? 'var(--nw)' : '#d64545'}"></i></div><p class=sm style="margin-top:10px;color:var(--tx)">${a}</p>${r.why.length ? `<p class=sm>${r.why.join('. ')}.</p>` : ''}</div>`;
}
const ICM =
    '<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11.5a6 6 0 0 0 12 0M12 17.5V21"/></svg>',
  ICS = '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  ICK = '<svg viewBox="0 0 24 24"><path d="M4 8h16M4 12h16M4 16h10"/></svg>';
let lacts = [],
  lmsg = '',
  lon = false;
const MAXW = () => (U() === 'kg' ? 700 : 1500);
function setMsg(n: string, f: string, v: number, typ?: string): string {
  if (!isFinite(v)) return '';
  if (f === 'w') {
    if (v <= 0) return 'A set needs a weight above 0 to count.';
    if (v > MAXW()) return `${v} ${U()} looks off (most lifts stay under ${MAXW()}).`;
    if (typ === 'W') return '';
    const L = lastFor(n, date),
      mx = L ? Math.max(0, ...L.sets.filter((x) => x.t !== 'W').map((x) => x.w || 0)) : 0;
    if (mx > 0 && (v > mx * 1.6 || v < mx * 0.4))
      return `${n}: ${v} ${U()} is far from last time (${mx} ${U()}).`;
  } else if (f === 'r') {
    if (v < 1 || v > 50 || v !== Math.round(v)) return `${v} reps looks off (whole number, 1 to 50).`;
  }
  return '';
}
let lwarn: { k: string; n: string; i: number; f: string; v: number; msg: string } | null = null;
const lwarnHTML = () =>
  lwarn
    ? `<div class=al role=alert>${esc(lwarn.msg)} <button class=lnk data-a=lkeep>Keep ${lwarn.v}</button> <button class=lnk data-a=lfix>Re-enter</button></div>`
    : '';
const sDone = (s) => s && s.w && s.r,
  NOSET = 'Did not catch that. Try: bench 185 for 8.';
function parseSet(s) {
  s = (s || '').toLowerCase();
  const m = s.match(/^(?:(.*?)\s+)?(\d+(?:\.\d)?)\s*(?:for|x|by|times)\s*(\d{1,2})\b/);
  if (!m) return [];
  const d = wd(date),
    E = prog().days[dayIdx(date)].ex,
    ex = E.map((e) => (d.sw || {})[e.n] || e.n),
    hint = (m[1] || '').split(/\s+/).filter((w) => w.length > 2);
  let n = hint.length ? ex.find((x) => hint.some((w) => x.toLowerCase().includes(w))) : null;
  if (!n)
    n =
      ex.find((x, j) => {
        const a = (d.sets || {})[x] || [],
          rows = d.rows && d.rows[x] != null ? d.rows[x] : E[j].s;
        for (let i = 0; i < rows; i++) if (!sDone(a[i])) return true;
        return false;
      }) || ex[0];
  return n
    ? [
        {
          t: 'set',
          n,
          w: +m[2],
          r: +m[3],
          l: n + ': ' + m[2] + ' x ' + m[3],
          wm: setMsg(n, 'w', +m[2]) || setMsg(n, 'r', +m[3]),
        },
      ]
    : [];
}
function applySets(A) {
  A.forEach((a) => {
    const d = wd(date),
      arr = ((d.sets || {})[a.n] || []).map((x) => x || {}),
      E = prog().days[dayIdx(date)].ex,
      j = E.findIndex((q) => q.n === a.n || (d.sw || {})[q.n] === a.n),
      rows = d.rows && d.rows[a.n] != null ? d.rows[a.n] : j >= 0 ? E[j].s : 3;
    let i = 0;
    while (i < Math.max(rows, arr.length) && sDone(arr[i])) i++;
    if (i >= rows) {
      const D = cl(d);
      if (D.k == null) D.k = dayIdx(date);
      D.rows = D.rows || {};
      D.rows[a.n] = i + 1;
      put('w-' + date, D);
    }
    setS(a.n, i, 'w', a.w);
    setS(a.n, i, 'r', a.r);
  });
}
function vbarL() {
  const off = !Voice.S || Voice.failed;
  return `<div class="cap ${lon ? 'on' : ''}"><input type=text id=qc-set data-vin enterkeyhint=send autocomplete=off placeholder="${lon ? 'Listening...' : 'Type or dictate: bench 185 for 8'}"><button type=button class=go data-a=qc aria-label="Preview">${ICS}</button></div>${lacts.length ? `<div class=vp><div>${lacts.map((a) => `<span class="pill ${a.wm ? 'warn' : ''}">${esc(a.l)}${a.wm ? ' (check)' : ''}</span>`).join(' ')}</div>${lacts.some((a) => a.wm) ? `<p class=vm>${esc(lacts.find((a) => a.wm).wm)}</p>` : ''}<div class=vb><button class=btn data-a=vsave>Log set</button><button class=lk data-a=vcancel>Cancel</button></div></div>` : ''}${lmsg ? `<p class=vm role=status>${esc(lmsg)}</p>` : ''}`;
}
function xhPanel(n) {
  const ss = logs()
      .map((k) => ({
        d: k.slice(2),
        a: ((mem[k].sets || {})[n] || []).filter((s) => s && s.w && s.r && s.t !== 'W' && s.t !== 'R'),
      }))
      .filter((x) => x.a.length),
    pts = ss.map((x) => ({ x: x.d, y: Math.round(Math.max(...x.a.map(e1))) })),
    rp = {};
  ss.forEach((x) =>
    x.a.forEach((s) => {
      if (!rp[s.w] || s.r > rp[s.w]) rp[s.w] = s.r;
    }),
  );
  const top = Object.entries(rp)
    .sort((a, b) => +b[0] - +a[0])
    .slice(0, 3);
  return `<div class=hint>${window.CH ? CH(pts) : ''}<p class=sm>Rep PRs: ${top.map(([w, r]) => r + ' reps at ' + w + ' ' + U()).join(', ') || 'none yet'}</p>${ss
    .slice(-5)
    .reverse()
    .map((x) => `<div class=sm>${x.d.slice(5)}: ${x.a.map((s) => s.w + 'x' + s.r).join(', ')}</div>`)
    .join('')}</div>`;
}
function exSess() {
  const o = {};
  logs().forEach((k) =>
    Object.entries(mem[k].sets || {}).forEach(([n, a]) => {
      const m = Math.max(0, ...a.map(e1));
      if (m > 0) (o[n] = o[n] || []).push({ d: k.slice(2), v: m });
    }),
  );
  return o;
}
function plateauCard() {
  const S = exSess(),
    pr = [],
    pl = [],
    now = iso(new Date());
  Object.entries(S).forEach(([n, a]) => {
    let best = 0;
    a.forEach((x, i) => {
      if (i > 0 && x.v > best * 1.002) pr.push({ d: x.d, n, v: Math.round(x.v) });
      best = Math.max(best, x.v);
    });
    if (a.length >= 4) {
      const prior = Math.max(...a.slice(0, -3).map((x) => x.v));
      if (Math.max(...a.slice(-3).map((x) => x.v)) <= prior * 1.005) pl.push({ n, v: Math.round(prior) });
    }
  });
  const w1 = pr.filter((x) => days(x.d, now) <= 7).length,
    w0 = pr.filter((x) => days(x.d, now) > 7 && days(x.d, now) <= 14).length,
    vv = (a, b) =>
      logs()
        .filter((k) => days(k.slice(2), now) >= a && days(k.slice(2), now) <= b)
        .reduce((t, k) => t + vol(mem[k]), 0),
    wv = vv(0, 6),
    pv = vv(7, 13),
    mv = Object.entries(S)
      .map(([n, a]) => {
        const r = a.filter((x) => days(x.d, now) <= 28);
        return r.length >= 2 ? { n, g: r[r.length - 1].v - r[0].v } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.g - a.g)[0],
    sl = P_.hist('sl', 7),
    low = sl.length && sl.reduce((a, b) => a + b, 0) / sl.length < 6.5;
  return `<div class=card><h3>Week in review</h3><table><tr><td>Volume vs last week</td><td>${pv ? Math.round(((wv - pv) / pv) * 100) + '%' : '-'}</td></tr><tr><td>PRs this week</td><td>${w1} (last week ${w0})</td></tr><tr><td>Biggest mover, 4 weeks</td><td>${mv && Math.round(mv.g) ? esc(mv.n) + ' ' + (mv.g >= 0 ? '+' : '') + Math.round(mv.g) + ' ' + U() : '-'}</td></tr></table></div>
<div class=card><h3>Plateau watch</h3>${pl.length ? pl.map((x) => `<div class=sm style="color:var(--tx)"><b>${esc(x.n)}</b>: no new best in 3 sessions (best ${x.v} ${U()}).</div>`).join('') + `<p class=sm>${low ? 'Your average sleep has been low, so recovery may be the limiter. Try a deload week.' : 'Try a deload week, change the rep range (add 2 reps or go heavier for 4 to 6), or add a rest day before this lift.'}</p>` : '<p class=sm>No stalled lifts. Plateaus show after 4 or more sessions of an exercise.</p>'}</div>
<div class=card><h3>PR feed</h3>${
    pr
      .sort((a, b) => (a.d < b.d ? 1 : -1))
      .slice(0, 8)
      .map((x) => `<div class=sm>${x.d.slice(5)} ${esc(x.n)}: estimated 1RM ${x.v} ${U()}</div>`)
      .join('') || '<p class=sm>PRs appear after your second session of an exercise.</p>'
  }</div>`;
}
function mvCard() {
  const cur = {},
    prv = {},
    grp = {},
    now = iso(new Date());
  prog().days.forEach((D) => D.ex.forEach((e) => (grp[e.n] = e.g || LIB[e.n] || 'Other')));
  logs().forEach((k) => {
    const ago = days(k.slice(2), now);
    if (ago < 0 || ago > 13) return;
    const T = ago <= 6 ? cur : prv;
    Object.entries(mem[k].sets || {}).forEach(([n, a]: [string, any]) =>
      a.forEach((s) => {
        if (s && s.w && s.r && s.t !== 'W') {
          const G = grp[n] || LIB[n] || 'Other';
          T[G] = T[G] || { n: 0, t: 0 };
          if (s.t !== 'R') T[G].n++;
          T[G].t += s.w * s.r;
        }
      }),
    );
  });
  return `<div class=card><h3>Weekly volume by muscle</h3>${GR.filter(
    (x) => cur[x] || prv[x] || x !== 'Other',
  )
    .map((x) => {
      const c = cur[x] || { n: 0, t: 0 },
        p = prv[x] || { n: 0, t: 0 },
        col = c.n < 10 ? 'var(--nw)' : c.n > 20 ? 'var(--pr)' : 'var(--dn)',
        dl = c.n - p.n;
      return `<div class=mvr><span>${x}</span><div class=mvb><i style="width:${Math.min(100, (c.n / 20) * 100)}%;background:${col}"></i></div><b>${c.n}</b></div>${c.n || p.n ? `<div class="sm mvs">${Math.round(c.t).toLocaleString()} ${U()}${p.n ? ', ' + (dl ? (dl > 0 ? '+' : '') + dl + ' sets vs previous 7 days' : 'same sets as previous 7 days') : ''}</div>` : ''}`;
    })
    .join('')}<p class=sm>Target 10 to 20 hard sets per muscle per week. Warm-ups excluded.</p></div>`;
}
function liftProgress() {
  const S = exSess(),
    now = iso(new Date()),
    rows = Object.entries(S)
      .map(([n, a]: [string, any]) => {
        const best = Math.max(...a.map((x) => x.v)),
          rec = a.filter((x) => days(x.d, now) <= 28),
          old = a.filter((x) => days(x.d, now) > 28),
          chg =
            rec.length && old.length
              ? Math.max(...rec.map((x) => x.v)) - Math.max(...old.map((x) => x.v))
              : null,
          prs = a.filter(
            (x, i) =>
              i > 0 && days(x.d, now) <= 56 && x.v > Math.max(...a.slice(0, i).map((y) => y.v)) * 1.002,
          ).length;
        return { n, best, chg, prs, ser: a.map((x) => x.v), last: a[a.length - 1].d };
      })
      .sort((x, y) => (x.last < y.last ? 1 : -1));
  if (!rows.length) return '';
  return `<div class=card><h3>Lift progress</h3><p class=sm>Estimated 1RM per lift. Change compares the last 4 weeks with everything before. Tap a lift for its chart.</p><table><tr><th>Lift</th><th>Best</th><th>4 wk</th><th></th></tr>${rows
    .map(
      (r) =>
        `<tr><td><button class=lnk data-a=hx data-v="${esc(r.n)}" aria-expanded=${hxN === r.n}>${esc(r.n)}</button>${r.prs ? ` <span class=pr>${r.prs} PR${r.prs > 1 ? 's' : ''}</span>` : ''}</td><td>${Math.round(r.best)} ${U()}</td><td>${r.chg == null ? 'new' : (r.chg > 0 ? '+' : '') + Math.round(r.chg)}</td><td>${spark(r.ser)}</td></tr>${hxN === r.n ? `<tr><td colspan=4>${xhPanel(r.n)}</td></tr>` : ''}`,
    )
    .join('')}</table></div>`;
}
const CT = ['Zone 2', 'Walk', 'Bike', 'Row', 'Swim', 'Other'],
  JT = [
    'Shoulder L',
    'Shoulder R',
    'Elbow L',
    'Elbow R',
    'Wrist',
    'Knee L',
    'Knee R',
    'Achilles',
    'Lower back',
    'Hip',
    'Other',
  ];
function cardioCard(d) {
  const lp = (j) => {
      const k = logs()
        .filter((k) => k.slice(2) < date && (mem[k].pn || []).some((x) => x.j === j))
        .pop();
      return k ? mem[k].pn.find((x) => x.j === j).p + '/10 on ' + k.slice(4) : null;
    },
    rec = JT.map((j) => {
      const v = lp(j);
      return v ? j + ' ' + v : '';
    })
      .filter(Boolean)
      .join(' | ');
  return `<div class=card><h3>Cardio and joints</h3>${(d.cd || []).map((x, i) => `<div class=sm>${x.t}: ${x.m} min${x.hr ? ', avg HR ' + x.hr : ''} <button class=lnk data-a=cdx data-v=${i}>Remove</button></div>`).join('')}<div class=g3><select id=ct1>${CT.map((x) => `<option>${x}</option>`).join('')}</select><input type=number inputmode=numeric id=cm1 placeholder="Min"><input type=number inputmode=numeric id=ch1 placeholder="Avg HR"></div><button class=btn data-a=cda style="margin:8px 0 14px">Add cardio</button>${(d.pn || []).map((x, i) => `<div class=sm>${x.j}: pain ${x.p}/10 <button class=lnk data-a=pnx data-v=${i}>Remove</button></div>`).join('')}<div class=g3 style="grid-template-columns:1fr 80px"><select id=pj>${JT.map((x) => `<option>${x}</option>`).join('')}</select><select id=pp>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => `<option>${x}</option>`).join('')}</select></div>${rec ? `<p class=sm>Recent: ${rec}</p>` : ''}<button class=btn data-a=pna style="margin-top:8px">Log joint pain</button><div class=rs style="margin-top:12px">Isometric hold ${[30, 45, 60].map((s) => `<button data-a=rest data-v=${s}>${s}s</button>`).join('')}</div></div>`;
}
function histV() {
  const wkd = logs().filter((k) => k.slice(2) > addD(iso(new Date()), -7)),
    wv = wkd.reduce((t, k) => t + vol(mem[k]), 0),
    ws = wkd.filter((k) => all(mem[k]).length).length,
    statH = `<div class=stat><div><b>${ws}</b><span>sessions, last 7 days</span></div><div><b>${Math.round(wv).toLocaleString()}</b><span>${U()} volume, last 7 days</span></div></div>`;
  const ks = logs()
    .reverse()
    .filter((k) => all(mem[k]).length || mem[k].st || mem[k].wk || mem[k].mb || mem[k].dn)
    .slice(0, 20);
  let h = ks.length
    ? `<div class=card><h3>Sessions</h3><table><tr><th>Day</th><th>Type</th><th>Volume</th></tr>${ks
        .map((k) => {
          const d = mem[k],
            x = d.k ?? 0;
          return `<tr><td><button class=lnk data-a=go data-v="${k.slice(2)}">${k.slice(7)}${d.dn ? ' &#10003;' : ''}</button></td><td>${esc(title(x))}</td><td>${isOff(x) ? (d.st || 0) + ' steps' : volT(d) || '-'}</td></tr>`;
        })
        .join('')}</table></div>`
    : '<div class=card>No sessions yet. Log a set on the Today tab to start your history.</div>';
  return statH + plateauCard() + liftProgress() + mvCard() + h;
}
function fin(d, k) {
  return d.dn
    ? `<div class="card"><h3>Day complete</h3><p class=sm>${isOff(k) ? 'Recovery logged.' : volT(d) || 'No sets logged.'}</p><button class=btn data-a=nx>Go to next day</button> <button class=lnk data-a=ro>Reopen</button></div>`
    : `<div class="card"><button class=btn data-a=fin style="width:100%;padding:14px">Complete day and go to next</button><p class=sm>Everything saves as you go. Completing marks the day done in History and moves to ${nm((k + 1) % CY())}.</p></div>`;
}
function render() {
  const k = dayIdx(date),
    d = wd(date),
    isT = date === iso(new Date()),
    body = tab === 'today' ? todayV() : tab === 'prog' ? progV() : histV();
  $('#app').innerHTML =
    `<div class=w data-t="${tab}"><header><div class=dr><button data-a=p aria-label="Previous day">&#8249;</button><div class=dt><b>${esc(title(k))}</b><i>${fmt(date)}${isT ? ' · Today' : ''}${d.dn ? ' · Done' : ''}</i>${isT ? '' : '<button class=lk data-a=td>Jump to today</button>'}</div><button data-a=n aria-label="Next day">&#8250;</button></div>
<div class=sg style="grid-template-columns:repeat(${CY()},1fr)">${Array.from({ length: CY() }, (_, i) => i)
      .map((i) => `<button data-a=dk data-v=${i} class="${i === k ? 'on' : ''}">${nm(i)}</button>`)
      .join(
        '',
      )}</div><div class=rs>Rest ${(prog().hit ? [15, 60, 150, 210] : [60, 90, 120, 180]).map((s) => `<button data-a=rest data-v=${s}>${s < 100 ? s + 's' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')}</button>`).join('')}<span id=vol>${volT(d)}</span></div></header>${body}${tab === 'today' ? fin(d, k) : ''}</div>
<nav>${[
      ['today', 'Today'],
      ['prog', 'Program'],
      ['hist', 'History'],
      ['sw', 'Protocol'],
    ]
      .map(
        ([t, l]) =>
          `<button data-a=tab data-v=${t} class="${tab === t ? 'on' : ''}">${IC[t]}<span>${l}</span></button>`,
      )
      .join('')}</nav>`;
  window.a11y && window.a11y($('#app'));
}
function rest(s, label = '') {
  clearInterval(tm);
  const e = Date.now() + s * 1000,
    t = $('#tm');
  t.hidden = false;
  const f = () => {
    const r = Math.ceil((e - Date.now()) / 1e3);
    if (r <= 0) {
      clearInterval(tm);
      t.hidden = true;
      try {
        navigator.vibrate && navigator.vibrate([200, 100, 200]);
      } catch (x) {}
      try {
        const A = new (window.AudioContext || window.webkitAudioContext)(),
          o = A.createOscillator();
        o.connect(A.destination);
        o.frequency.value = 880;
        o.start();
        o.stop(A.currentTime + 0.25);
      } catch (x) {}
      return;
    }
    t.textContent = (label ? label + ' ' : '') + Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0');
  };
  f();
  tm = setInterval(f, 500);
}
// HIT timing from the routine: feeders 45-60 s apart, 2.5 min before the working set,
// 15 s rest-pause, 3.5 min before the next exercise.
function autoRest(n: string, i: number) {
  const ex = exOf(n),
    a = (wd(date).sets || {})[n] || [],
    x = a[i] || {};
  if (!prog().hit || !ex) return rest(cfg().rs || 90);
  if (x.t === 'W') {
    const more = a.slice(i + 1).some((y) => y && y.t === 'W');
    return more ? rest(60, 'Feeder') : rest(150, 'Working set');
  }
  if (x.t === 'R') return rest(210, 'Next lift');
  if (ex.rp && !a.some((y) => y && y.t === 'R' && y.r)) return rest(15, 'Rest-pause');
  return rest(210, 'Next lift');
}
function setS(n, i, f, v) {
  const d = cl(wd(date));
  if (d.k == null) d.k = dayIdx(date);
  d.sets = d.sets || {};
  const a = (d.sets[n] = (d.sets[n] || []).map((x) => x || {}));
  while (a.length <= i) a.push({});
  if (v === null || v === '') delete a[i][f];
  else a[i][f] = v;
  tagRP(a, n);
  put('w-' + date, d);
}
// Rest-pause: the working row after the prescribed sets is stored as type 'R' so stats ignore it.
const exOf = (n: string) => {
  const ex = ((prog().days[dayIdx(date)] || {}).ex || []) as any[];
  return ex.find((x) => x.n === n) || ex.find((x) => x.o === n);
};
function tagRP(a: any[], n: string) {
  const ex = exOf(n);
  a.forEach((x) => {
    if (x && x.t === 'R') delete x.t;
  });
  if (!ex || !ex.rp) return;
  let c = 0;
  for (const x of a) {
    if (x.t === 'W') continue;
    if (c === ex.s) {
      if (!x.t) x.t = 'R';
      break;
    }
    c++;
  }
}
const app = $('#app');
app.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-a]');
  if (!b) return;
  const a = b.dataset.a,
    v = b.dataset.v,
    d = cl(wd(date));
  if (a !== 'lkeep' && a !== 'lfix') lwarn = null;
  if (a === 'p' || a === 'n') {
    date = addD(date, a === 'p' ? -1 : 1);
  } else if (a === 'td') date = iso(new Date());
  else if (a === 'tab') {
    if (v === 'sw') {
      window.gomod('p');
      return;
    }
    tab = v;
    lacts = [];
    lmsg = '';
  } else if (a === 'go') {
    date = v;
    tab = 'today';
  } else if (a === 'wu') {
    const L = lastFor(v, date),
      cur = (d.sets || {})[v] || [],
      base =
        Math.max(0, ...cur.filter((s) => s && s.t !== 'W').map((s) => s.w || 0)) ||
        (L ? Math.max(0, ...L.sets.map((s) => s.w || 0)) : 0) ||
        +($('#wuw') || {}).value ||
        0;
    if (!base) {
      wun = v;
      render();
      return;
    }
    const st = U() === 'kg' ? 2.5 : 5,
      rd = (x) => Math.max(st, Math.round(x / st) * st),
      t = prog().days[dayIdx(date)].ex.find((x) => x.n === v),
      txt = ((t || {}).wu as string) || (prog().hit ? 'Feeler: 70% x 4' : ''),
      parsed = Array.from(txt.matchAll(/(\d+)%\s*x\s*(\d+)(?:-(\d+))?/g)).map((m) => [
        +m[1] / 100,
        +(m[3] || m[2]),
      ]),
      step = U() === 'kg' ? 1.25 : 2.5,
      rdf = (x) => Math.max(step, Math.round(x / step) * step),
      W = parsed.length
        ? parsed.map(([q, r]) => ({ w: rdf(base * q), r, t: 'W' }))
        : [
            [0.4, 8],
            [0.6, 5],
            [0.8, 3],
          ].map(([q, r]) => ({ w: rd(base * q), r, t: 'W' }));
    if (d.k == null) d.k = dayIdx(date);
    d.sets = d.sets || {};
    d.rows = d.rows || {};
    const r0 = d.rows[v] != null ? d.rows[v] : Math.max(t ? t.s + (t.rp ? 1 : 0) : 0, cur.length);
    d.sets[v] = W.concat(cur);
    d.rows[v] = r0 + W.length;
    wun = null;
    put('w-' + date, d);
  } else if (a === 'ap') {
    if (applyW(d, v)) put('w-' + date, d);
  } else if (a === 'apall') {
    let ch = false;
    prog().days[dayIdx(date)].ex.forEach((x) => {
      if (applyW(d, (d.sw || {})[x.n] || x.n)) ch = true;
    });
    if (ch) put('w-' + date, d);
  } else if (a === 'mic') {
    if (lon) {
      Voice.stop();
      return;
    }
    lmsg = '';
    const ok = Voice.start(
      (tx, fin) => {
        const q = $('#qc-set');
        if (q) q.value = tx;
        if (fin) {
          lacts = parseSet(tx);
          lmsg = lacts.length ? '' : NOSET;
          lon = false;
          render();
        }
      },
      () => {
        if (lon) {
          lon = false;
          render();
        }
      },
      (err) => {
        lon = false;
        lmsg =
          err === 'not-allowed' || err === 'service-not-allowed'
            ? 'Microphone is blocked here. Keyboard is open: tap the mic on your keyboard to dictate.'
            : err === 'timeout'
              ? 'No audio from the microphone. Keyboard is open: tap the mic on your keyboard to dictate.'
              : 'The Claude app blocks in-page voice. Keyboard is open: tap the mic on your keyboard to dictate.';
        render();
        setTimeout(() => {
          const q = $('#qc-set');
          if (q) q.focus();
        }, 60);
      },
    );
    if (ok) {
      lon = true;
      render();
    } else {
      setTimeout(() => {
        const q = $('#qc-set');
        if (q) q.focus();
      }, 60);
    }
  } else if (a === 'qc') {
    lacts = parseSet($('#qc-set').value);
    lmsg = lacts.length ? '' : NOSET;
  } else if (a === 'vsave') {
    applySets(lacts);
    lacts = [];
    lmsg = 'Logged';
  } else if (a === 'vcancel') {
    lacts = [];
    lmsg = '';
  } else if (a === 'flall') {
    let ch = false;
    prog().days[dayIdx(date)].ex.forEach((x) => {
      const n = (d.sw || {})[x.n] || x.n,
        L = lastFor(n, date);
      if (!L || ((d.sets || {})[n] || []).some((s) => s && s.w)) return;
      if (d.k == null) d.k = dayIdx(date);
      d.sets = d.sets || {};
      d.rows = d.rows || {};
      d.sets[n] = L.sets.map((q) => ({ w: q.w, r: q.r }));
      d.rows[n] = L.sets.length;
      ch = true;
    });
    if (ch) put('w-' + date, d);
  } else if (a === 'pgs') {
    try {
      const dl = await claude.use('downloads');
      if (dl) await dl.save({ filename: 'daily-program.json', data: JSON.stringify(programFile(prog(), prog().name || 'My program'), null, 1) });
    } catch (x) {}
    return;
  } else if (a === 'imp') {
    const D = [];
    $('#imp')
      .value.split('\n')
      .forEach((raw) => {
        const ln = raw.trim();
        if (!ln) return;
        const m = ln.match(/^(.*?)[\s:,-]+(\d+)\s*[x×]\s*(\d+(?:\s*-\s*\d+)?)\s*(.*)$/i);
        if (m && D.length)
          D[D.length - 1].ex.push({
            n: m[1].trim(),
            s: +m[2],
            r: m[3].replace(/\s/g, ''),
            t: m[4].replace(/^[-,:\s]+/, ''),
            g: LIB[m[1].trim()] || 'Other',
          });
        else if (!m)
          D.push({
            n:
              ln
                .replace(/^day\s*\d*[:\s-]*/i, '')
                .replace(/:$/, '')
                .trim() || 'Day ' + (D.length + 1),
            ex: [],
          });
      });
    const days_ = D.filter((x) => x.ex.length);
    if (!days_.length) return;
    un(cl(prog()), 'Program replaced');
    const P = cl(prog());
    P.days = days_;
    put('prog', P);
  } else if (a === 'lkeep') {
    if (lwarn) {
      setS(lwarn.n, lwarn.i, lwarn.f, lwarn.v);
      if (lwarn.f === 'r' && cfg().auto !== 0) autoRest(lwarn.n, lwarn.i);
    }
    lwarn = null;
  } else if (a === 'lfix') {
    const k = lwarn && lwarn.k;
    lwarn = null;
    setTimeout(() => {
      const el =
        k &&
        (Array.from(SR.querySelectorAll('input[data-s]')) as HTMLInputElement[]).find(
          (x) => x.dataset.s === k,
        );
      el && el.focus();
    }, 60);
  } else if (a === 'xnt') {
    xnN = xnN === v ? null : v;
  } else if (a === 'xp') {
    d.k = d.k ?? dayIdx(date);
    d.xp = d.xp || {};
    d.xp[v] ? delete d.xp[v] : (d.xp[v] = 1);
    put('w-' + date, d);
  } else if (a === 'hx') {
    hxN = hxN === v ? null : v;
  } else if (a === 'xh') {
    xh = xh === v ? null : v;
  } else if (a === 'cda') {
    const m = +$('#cm1').value;
    if (!m) return;
    if (d.k == null) d.k = dayIdx(date);
    d.cd = (d.cd || []).concat({ t: $('#ct1').value, m, hr: +$('#ch1').value || '' });
    put('w-' + date, d);
  } else if (a === 'cdx') {
    d.cd.splice(+v, 1);
    put('w-' + date, d);
  } else if (a === 'pna') {
    if (d.k == null) d.k = dayIdx(date);
    d.pn = (d.pn || []).concat({ j: $('#pj').value, p: +$('#pp').value });
    put('w-' + date, d);
  } else if (a === 'pnx') {
    d.pn.splice(+v, 1);
    put('w-' + date, d);
  } else if (a === 'ss') {
    const [i, j] = v.split('|').map(Number),
      P = cl(prog());
    P.days[i].ex[j].ss = !P.days[i].ex[j].ss;
    put('prog', P);
  } else if (a === 'sw') {
    swp = v;
  } else if (a === 'sg') {
    const n = $('#swn').value.trim();
    d.sw = d.sw || {};
    n ? (d.sw[v] = n) : delete d.sw[v];
    if (d.k == null) d.k = dayIdx(date);
    put('w-' + date, d);
    swp = null;
  } else if (a === 'tpu') {
    un(cl(prog()), 'Program replaced');
    put('prog', programData(TPL[tplSel]));
  } else if (a === 'tps') {
    const t = TPL[tplSel];
    try {
      const dl = await claude.use('downloads');
      if (dl) await dl.save({ filename: 'daily-program-' + t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json', data: JSON.stringify(t, null, 1) });
    } catch (x) {}
    return;
  } else if (a === 'doff') {
    const P = cl(prog()),
      D = P.days[+v];
    if (!D) return;
    if (D.off) {
      delete D.off;
      if (D.n === 'Rest') D.n = 'Day ' + (+v + 1);
    } else if (P.days.filter((x) => !x.off).length > 1) {
      D.off = true;
    } else return;
    put('prog', P);
  } else if (a === 'dmu' || a === 'dmd') {
    const P = cl(prog()),
      i = +v,
      j = a === 'dmu' ? i - 1 : i + 1;
    if (j < 0 || j >= P.days.length) return;
    [P.days[i], P.days[j]] = [P.days[j], P.days[i]];
    put('prog', P);
  } else if (a === 'ad') {
    const N = ON(),
      P = cl(prog());
    P.days.push(v === 'off' ? { n: 'Rest', off: true, ex: [] } : { n: 'Day ' + (N + 1), ex: [] });
    if (!hasOff())
      logs().forEach((k) => {
        if (mem[k].k === N) {
          const D = cl(mem[k]);
          D.k = N + 1;
          put(k, D);
        }
      });
    put('prog', P);
  } else if (a === 'rmd') {
    const N = ON();
    if (N <= 1) return;
    const P = cl(prog());
    P.days.pop();
    if (!hasOff())
      logs().forEach((k) => {
        if (mem[k].k === N || mem[k].k === N - 1) {
          const D = cl(mem[k]);
          D.k = N - 1;
          put(k, D);
        }
      });
    put('prog', P);
  } else if (a === 'dk') {
    const c = cl(cfg());
    c.start = addD(date, -+v);
    put('wcfg', c);
    d.k = +v;
    put('w-' + date, d);
  } else if (a === 'f') {
    const [n, i] = v.split('|'),
      s = ((d.sets || {})[n] || [])[+i] || {},
      cur = s.t || (s.f ? 'F' : ''),
      nx = { '': 'F', F: 'W', W: 'D', D: '', R: '' }[cur];
    setS(n, +i, 'f', null);
    setS(n, +i, 't', nx || null);
  } else if (a === 'as') {
    const n = v,
      t = prog().days[dayIdx(date)].ex.find((x) => x.n === n),
      arr = (d.sets || {})[n] || [],
      r = d.rows && d.rows[n] != null ? d.rows[n] : Math.max(t ? t.s : 0, arr.length);
    if (d.k == null) d.k = dayIdx(date);
    d.rows = d.rows || {};
    d.rows[n] = r + 1;
    put('w-' + date, d);
  } else if (a === 'rm') {
    const [n, i] = v.split('|'),
      ix = +i,
      t = prog().days[dayIdx(date)].ex.find((x) => x.n === n),
      arr = (d.sets || {})[n] || [],
      r = d.rows && d.rows[n] != null ? d.rows[n] : Math.max(t ? t.s : 0, arr.length);
    if (r <= 1) return;
    if (d.k == null) d.k = dayIdx(date);
    if (arr.length > ix) arr.splice(ix, 1);
    d.rows = d.rows || {};
    d.rows[n] = r - 1;
    put('w-' + date, d);
  } else if (a === 'so') {
    if (d.k == null) d.k = dayIdx(date);
    d.so = +v;
    put('w-' + date, d);
  } else if (a === 'fl') {
    const L = lastFor(v, date);
    if (!L) return;
    if (d.k == null) d.k = dayIdx(date);
    d.sets = d.sets || {};
    d.sets[v] = L.sets.map((x) => ({ w: x.w, r: x.r }));
    d.rows = d.rows || {};
    d.rows[v] = L.sets.length;
    put('w-' + date, d);
  } else if (a === 'rest') {
    rest(+v);
    return;
  } else if (a === 'fin') {
    window.pop && pop();
    if (d.k == null) d.k = dayIdx(date);
    d.dn = Date.now();
    put('w-' + date, d);
    date = addD(date, 1);
  } else if (a === 'nx') {
    date = addD(date, 1);
  } else if (a === 'ro') {
    delete d.dn;
    put('w-' + date, d);
  } else if (a === 'dl') {
    const c = cl(cfg());
    c.dl = iso(new Date());
    put('wcfg', c);
  } else if (a === 'ae') {
    const P = cl(prog());
    P.days[+v].ex.push({ n: 'New exercise', s: 3, r: '8-12', t: '' });
    put('prog', P);
  } else if (a === 're') {
    const [i, j] = v.split('|'),
      P = cl(prog());
    un(cl(prog()));
    P.days[+i].ex.splice(+j, 1);
    put('prog', P);
  } else if (a === 'mu' || a === 'md') {
    const [i, j] = v.split('|').map(Number),
      P = cl(prog()),
      A = P.days[i].ex,
      t = a === 'mu' ? j - 1 : j + 1;
    if (t < 0 || t >= A.length) return;
    [A[j], A[t]] = [A[t], A[j]];
    put('prog', P);
  } else if (a === 'rd') {
    const P = cl(prog()),
      A = P.days[dayIdx(date)].ex,
      ix = A.findIndex((x) => x.n === v);
    if (ix < 0) return;
    un(cl(prog()));
    A.splice(ix, 1);
    put('prog', P);
  } else if (a === 'csv') {
    const r = [['date', 'day', 'exercise', 'set', 'weight', 'reps', 'failure']];
    logs().forEach((k) => {
      const D = mem[k];
      Object.entries(D.sets || {}).forEach(([n, arr]) =>
        arr.forEach((s, i) => {
          if (s && s.w && s.r)
            r.push([
              k.slice(2),
              title(D.k ?? 0),
              '"' + n.replace(/"/g, '""') + '"',
              i + 1,
              s.w,
              s.r,
              s.f ? 1 : 0,
            ]);
        }),
      );
    });
    try {
      const dl = await claude.use('downloads');
      if (dl) await dl.save({ filename: 'lift-log.csv', data: r.map((x) => x.join(',')).join('\n') });
    } catch (x) {}
  }
  render();
  if (['p', 'n', 'td', 'tab', 'fin', 'nx', 'go'].includes(a)) {
    scrollTo(0, 0);
    const w = $('.w');
    w && w.classList.add('go');
  }
});
app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'tpl') {
    tplSel = +t.value || 0;
    render();
    return;
  }
  if (t.id === 'sch') {
    const P = cl(prog());
    schMsg = '';
    if (t.value === 'week') {
      if (P.days.length > 7) {
        schMsg = 'A week has 7 days. Remove days until there are 7 or fewer, then switch.';
        render();
        return;
      }
      while (P.days.length < 7) P.days.push({ n: 'Rest', off: true, ex: [] });
      P.sched = 'week';
    } else delete P.sched;
    put('prog', P);
    render();
    return;
  }
  if (t.dataset.s) {
    const [n0, i, f] = t.dataset.s.split('|'),
      n = n0.replace(/&amp;/g, '&');
    if (t.value !== '' && (f === 'w' || f === 'r')) {
      const typ = (((wd(date).sets || {})[n] || [])[+i] || {}).t,
        msg = setMsg(n, f, Number(t.value), typ);
      if (msg) {
        lwarn = { k: t.dataset.s, n, i: +i, f, v: Number(t.value), msg };
        render();
        return;
      }
    }
    lwarn = null;
    setS(n, +i, f, t.value === '' ? null : Number(t.value));
    const o = $('#vol');
    if (o) o.textContent = volT(wd(date));
    if (f === 'r' && t.value !== '' && cfg().auto !== 0) autoRest(n, +i);
  } else if (t.dataset.xn) {
    const d = cl(wd(date));
    if (d.k == null) d.k = dayIdx(date);
    d.xn = d.xn || {};
    t.value.trim() ? (d.xn[t.dataset.xn] = t.value.trim()) : delete d.xn[t.dataset.xn];
    put('w-' + date, d);
  } else if (t.dataset.x) {
    P_.set(date, t.dataset.x, t.value === '' ? '' : Number(t.value));
  } else if (t.dataset.k) {
    const d = cl(wd(date));
    if (d.k == null) d.k = dayIdx(date);
    d[t.dataset.k] = t.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value;
    put('w-' + date, d);
  } else if (t.dataset.cu) {
    const to = t.value,
      from = U();
    if (to === from) return;
    const f = to === 'kg' ? 0.45359237 : 1 / 0.45359237,
      m = to === 'kg' ? 2 : 1;
    logs().forEach((k) => {
      const D = cl(mem[k]);
      Object.values(D.sets || {}).forEach((a) =>
        a.forEach((s) => {
          if (s && s.w) s.w = Math.round(s.w * f * m) / m;
        }),
      );
      if (D.bw) D.bw = Math.round(D.bw * f * 10) / 10;
      put(k, D);
    });
    const c = cl(cfg());
    c.u = to;
    put('wcfg', c);
    render();
  } else if (t.dataset.cf) {
    const c = cl(cfg());
    c[t.dataset.cf] = Number(t.value);
    put('wcfg', c);
  } else if (t.dataset.p) {
    const p = t.dataset.p.split('|'),
      P = cl(prog());
    if (p.length === 2) P.days[+p[0]].n = t.value;
    else {
      const ex = P.days[+p[0]].ex[+p[1]],
        old = ex.n;
      ex[p[2]] = p[2] === 's' ? Math.max(1, Number(t.value) || 1) : t.value;
      if (p[2] === 'n' && LIB[ex.n]) ex.g = LIB[ex.n];
      if (p[2] === 'n' && old !== ex.n)
        logs().forEach((k) => {
          const D = cl(mem[k]);
          let ch = false;
          if (D.sets && D.sets[old]) {
            D.sets[ex.n] = D.sets[old];
            delete D.sets[old];
            ch = true;
          }
          if (D.rows && D.rows[old] != null) {
            D.rows[ex.n] = D.rows[old];
            delete D.rows[old];
            ch = true;
          }
          if (ch) put(k, D);
        });
    }
    put('prog', P);
  }
});
let sx = 0,
  sy = 0,
  sw = null,
  dx = 0,
  hz = false,
  sup = 0;
const swClose = (ex) =>
  SR.querySelectorAll('.swr.open').forEach((r) => {
    if (r !== ex) r.classList.remove('open');
  });
app.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button) return;
  swClose(e.target.closest('.swr'));
  sw = e.target.closest('[data-sw]');
  if (!sw) return;
  sx = e.clientX;
  sy = e.clientY;
  dx = 0;
  hz = false;
});
app.addEventListener('pointermove', (e) => {
  if (!sw) return;
  const x = e.clientX - sx,
    y = e.clientY - sy;
  if (!hz) {
    if (Math.abs(y) > 12 && Math.abs(y) > Math.abs(x)) {
      sw = null;
      return;
    }
    if (Math.abs(x) > 10 && Math.abs(x) > Math.abs(y)) {
      hz = true;
      try {
        app.setPointerCapture(e.pointerId);
      } catch (_) {}
      sw.parentElement.classList.add('dragging');
    }
  }
  if (!hz) return;
  dx = x;
  const o = sw.parentElement.classList.contains('open') ? -96 : 0;
  sw.style.transition = 'none';
  sw.style.transform = `translateX(${Math.max(-96, Math.min(0, o + x))}px)`;
});
const swEnd = () => {
  if (!sw) return;
  const r = sw.parentElement,
    was = r.classList.contains('open');
  r.classList.remove('dragging');
  sw.style.transition = '';
  sw.style.transform = '';
  if (hz) {
    sup = Date.now();
    (was ? dx < 40 : dx < -50) ? r.classList.add('open') : r.classList.remove('open');
  }
  sw = null;
  hz = false;
};
app.addEventListener('pointerup', swEnd);
app.addEventListener('pointercancel', swEnd);
app.addEventListener(
  'click',
  (e) => {
    if (Date.now() - sup < 350) {
      e.stopPropagation();
      e.preventDefault();
    }
  },
  true,
);
app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.hasAttribute && e.target.hasAttribute('data-vin')) {
    lacts = parseSet(e.target.value);
    lmsg = lacts.length ? '' : NOSET;
    render();
  }
});
$('#tm').addEventListener('click', () => {
  clearInterval(tm);
  $('#tm').hidden = true;
});
window.L_ = {
  g: () => date,
  s: (v) => {
    date = v;
  },
  r: () => render(),
  kind: (s) => (isOff(dayIdx(s)) ? 'R' : 'L'),
  has: (s) => all(wd(s)).length > 0,
  put: put,
  mem: () => mem,
  del: (k) => {
    delete mem[k];
    try {
      IDB.del(k).catch(() => {});
    } catch (e) {}
  },
  rev: (from: string, to: string) => {
    const ks = logs().filter((k) => k.slice(2) >= from && k.slice(2) <= to),
      w = ks.filter((k) => all(mem[k]).length),
      pr: Record<string, { n: string; v: number; d: string }> = {};
    w.forEach((k) =>
      Object.entries(mem[k].sets || {}).forEach(([n, a]: [string, any]) => {
        const m = Math.max(0, ...a.map(e1)),
          b = best(n, k.slice(2));
        if (b > 0 && m > b * 1.002 && (!pr[n] || m > pr[n].v)) pr[n] = { n, v: Math.round(m), d: k.slice(2) };
      }),
    );
    return {
      n: w.length,
      v: w.reduce((t, k) => t + vol(mem[k]), 0),
      u: U(),
      sets: w.reduce((t, k) => t + all(mem[k]).length, 0),
      c: ks.reduce((t, k) => t + (mem[k].cd || []).reduce((a, x) => a + (+x.m || 0), 0), 0),
      pr: Object.values(pr).sort((a, b) => b.v - a.v),
    };
  },
  wk: () => {
    const w = logs().filter((k) => k.slice(2) > addD(iso(new Date()), -7) && all(mem[k]).length);
    return {
      n: w.length,
      v: w.reduce((t, k) => t + vol(mem[k]), 0),
      u: U(),
      c: logs()
        .filter((k) => k.slice(2) > addD(iso(new Date()), -7))
        .reduce((t, k) => t + (mem[k].cd || []).reduce((a, x) => a + (+x.m || 0), 0), 0),
    };
  },
};
boot().then(() => {
  render();
  window.P_ && P_.r();
});
render();
