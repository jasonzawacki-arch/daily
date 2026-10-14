import protocolCss from './protocol.css';
const SR = document.getElementById('hp').attachShadow({ mode: 'open' });
SR.innerHTML =
  '<style>' +
  protocolCss +
  '</style><div id=app></div><div id=ut hidden role=status aria-live=polite></div><button id=jn class=jn hidden>Jump to now</button>';

const $ = (s) => SR.querySelector(s),
  esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const Wn = [
  ['03:20', 'Wake and hydrate'],
  ['04:00', 'Training'],
  ['05:00', 'Post-workout and Meal 1'],
  ['08:00', 'Morning supplements'],
  ['10:00', 'Fiber and water 1'],
  ['11:15', 'Meal 2 and organ stack'],
  ['13:30', 'Midday walk and BP check'],
  ['16:15', 'Fiber and water 2'],
  ['17:15', 'Dinner and evening stack'],
  ['20:30', 'Evening wind-down'],
  ['21:15', 'Sleep stack and lights out'],
];
const I = [
  [0, 'Wake up: water + pinch of salt', 'A'],
  [0, 'Vitamin D3 2,000 IU', 'A'],
  [0, 'Omega-3 fish oil 1,000 mg', 'A'],
  [0, 'Multivitamin', 'A'],
  [0, 'Pre-workout: coffee or green tea', 'L'],
  [0, 'Morning walk 20 min', 'R'],
  [0, 'Stretch 10 min (Mon/Thu)', 'A', 'mt'],
  [0, 'Creatine 5 g', 'A'],
  [1, 'Training session done', 'L'],
  [1, 'Intra-workout: 20 g carbs + electrolytes in 24 oz water', 'L'],
  [1, 'Walk / mobility done', 'R'],
  [2, 'Meal 1: 40 g protein, 60 g carbs', 'L'],
  [2, 'Meal 1 (light): 40 g protein, no carbs', 'R'],
  [2, 'Protein shake 30 g', 'A'],
  [2, 'Collagen 10 g', 'A'],
  [2, 'Vitamin C 500 mg', 'A'],
  [3, 'B-complex 1 capsule', 'A'],
  [3, 'Electrolyte tablet in 16 oz water', 'A'],
  [3, 'Weekly weigh-in and photo (Mondays)', 'A', 'mo'],
  [3, 'Foam rolling 10 min (Mon/Thu)', 'A', 'mt'],
  [3, '24 oz water + pinch of salt', 'A'],
  [3, 'Zinc 15 mg', 'A'],
  [4, 'Psyllium 5 g + 20 oz water', 'A'],
  [5, 'Magnesium 400 mg', 'L'],
  [5, 'Meal 2: 40 g protein, 50 g carbs, vegetables', 'L'],
  [5, 'Meal 2 (light): 40 g protein + water', 'R'],
  [5, 'Creatine 5 g', 'A'],
  [5, 'Fish oil 1,000 mg (with food)', 'A'],
  [5, 'Turmeric 500 mg', 'A'],
  [5, 'Probiotic 1 capsule', 'A'],
  [5, 'Green tea 2 cups', 'A'],
  [5, 'Vitamin K2 100 mcg (Mon/Thu)', 'A', 'mt'],
  [6, 'Afternoon walk 15 min (weekdays)', 'A', 'wd'],
  [6, 'Seated BP check at 2:00 PM (target 115-125 / 75-82)', 'A'],
  [7, 'Psyllium 5 g + 20 oz water', 'A'],
  [8, 'Dinner: 8 oz protein, rice or potato, vegetables', 'L'],
  [8, 'Dinner (light): 8 oz chicken, vegetables', 'R'],
  [8, 'Evening stretch 5 min', 'A'],
  [8, 'Magnesium 400 mg', 'A'],
  [8, 'Zinc 15 mg', 'R'],
  [8, 'Multivitamin (evening)', 'A'],
  [8, 'Digestive enzymes', 'A'],
  [8, 'Fish oil 1,000 mg', 'R'],
  [8, 'Vitamin C 500 mg', 'A', '', '2026-10-12'],
  [8, 'Turmeric 500 mg', 'A'],
  [8, 'Probiotic 1 capsule', 'A', '', '2026-11-11'],
  [9, 'Plan tomorrow\'s meals (weekdays)', 'A', 'wd'],
  [9, 'Casein shake 25 g (empty stomach optional)', 'A'],
  [10, 'Peanut butter 1 tbsp', 'A'],
  [10, 'Glycine 3 g', 'A'],
  [10, 'Taurine 1 g', 'A'],
  [10, 'Chamomile tea', 'A'],
  [10, 'Magnesium 200 mg', 'A'],
  [10, 'Lights out: cool dark room, fluids 4-6 oz max', 'A'],
];
const IC = {
  today: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  vitals: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>',
  hist: '<svg viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
  sw: '<svg viewBox="0 0 24 24"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
  fuel: '<svg viewBox="0 0 24 24"><path d="M7 3v8a3 3 0 0 0 3 3v7M7 3v5M10 3v5M17 3c-2 2-2 6 0 8v10"/></svg>',
  more: '<svg viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/></svg>',
};
const LS = 'pl:',
  q = {};
let col = null,
  mem: Record<string, any> = {},
  mode = 'device',
  tab = 'today',
  edit = false,
  opn = new Set();
const iso = (d) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};
const addD = (s, n) => {
    const d = new Date(s + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  },
  dow = (s) => new Date(s + 'T12:00:00').getDay();
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
const cfg = () => mem.cfg || {},
  all = () =>
    I.map((x, i) => ({
      id: 'i' + i,
      w: x[0],
      l: (cfg().lab || {})['i' + i] || x[1],
      tag: x[2],
      d: x[3] || '',
      f: x[4] || '',
    })).concat((cfg().custom || []).map((x, i) => ({ id: 'c' + i, w: x.w, l: x.l, tag: x.tag, d: x.d || '' })));
function typeOf(s) {
  const d = mem['d-' + s];
  if (d && d.t) return d.t;
  if (window.L_) {
    try {
      return L_.kind(s);
    } catch (e) {}
  }
  let n = 0,
    p = addD(s, -1);
  while (n < 3) {
    const x = mem['d-' + p];
    if (x && x.t === 'L') {
      n++;
      p = addD(p, -1);
    } else break;
  }
  return n >= 3 ? 'R' : 'L';
}
function dueOn(x, s, t = typeOf(s)) {
  const w = dow(s);
  return (
    (!actF(x) || s >= actF(x)) &&
    (x.tag === 'A' || x.tag === t) &&
    ((cfg().sch || {})[x.id]
      ? cfg().sch[x.id].includes(w)
      : !x.d ||
        (x.d === 'wd' && w > 0 && w < 6) ||
        (x.d === 'mt' && (w === 1 || w === 4)) ||
        (x.d === 'mo' && w === 1))
  );
}
function items(s, ed) {
  const t = typeOf(s),
    h = cfg().hide || {};
  return all()
    .filter((x) => dueOn(x, s, t))
    .map((x) => ({ ...x, hid: !!h[x.id] }))
    .filter((x) => ed || !x.hid);
}
const prog = (s) => {
  const D = mem['d-' + s] || {};
  if (D.dn && D.pd) return D.pd;
  const c = D.c || {},
    sk = (x) => ((D.ws || {})[x.w] || {}).s === 'skipped',
    it = items(s, false).filter((x) => !sk(x));
  return [it.filter((x) => c[x.id]).length, it.length];
};
let wantNow = false;
function winLeft(i: number) {
  const c = (mem['d-' + date] || {}).c || {};
  return items(date, false).filter((x) => x.w === i && !c[x.id]).length;
}
// The window to focus: the current one if unfinished, else the next unfinished one.
function focusWin() {
  if (date !== iso(new Date())) return -1;
  const cw = curWin();
  if (cw >= 0 && winLeft(cw)) return cw;
  for (let i = Math.max(cw + 1, 0); i < Wn.length; i++) if (winLeft(i)) return i;
  return -1;
}
function resetOpen() {
  opn = new Set();
  if (date === iso(new Date())) {
    const f = focusWin();
    if (f >= 0) opn.add(f);
    wantNow = true;
  }
}
function curWin() {
  if (date !== iso(new Date())) return -1;
  const n = new Date(),
    m = n.getHours() * 60 + n.getMinutes();
  let cw = -1;
  Wn.forEach((w, i) => {
    const [a, b] = w[0].split(':');
    if (+a * 60 + +b <= m) cw = i;
  });
  return cw;
}
const RNG = {
  sys: [70, 220, 'Systolic'],
  dia: [40, 130, 'Diastolic'],
  wt: [80, 600, 'Weight'],
  sl: [0, 16, 'Sleep'],
  hr: [30, 200, 'Resting HR'],
  aw: [0, 15, 'Wakes'],
  wc: [15, 80, 'Waist'],
  sa: [0, 720, 'Minutes awake'],
  neck: [8, 30, 'Neck'],
  chest: [20, 80, 'Chest'],
  arm: [6, 30, 'Arm'],
  thigh: [10, 50, 'Thigh'],
};
function rangeMsg(k: string, v: number, partner = true) {
  const m = k.match(/^bp\.(am|pm|ev)\.(\d)$/),
    key = m ? (m[2] === '0' ? 'sys' : 'dia') : k.startsWith('ms.') ? k.slice(3) : k,
    r = RNG[key];
  if (!r) return '';
  if (v < r[0] || v > r[1]) return `${r[2]} ${v} looks off (usual ${r[0]}-${r[1]}).`;
  if (m && partner) {
    const o = val(mem['d-' + date] || {}, 'bp.' + m[1] + '.' + (m[2] === '0' ? 1 : 0));
    if (o !== '' && o != null) {
      const s = m[2] === '0' ? v : o,
        dd = m[2] === '0' ? o : v;
      if (dd >= s) return `Diastolic should be lower than systolic (${s}/${dd}).`;
    }
  }
  return '';
}
function actWarn(a): string {
  if (a.t === 'bp')
    return (
      rangeMsg('bp.am.0', a.v[0], false) ||
      rangeMsg('bp.am.1', a.v[1], false) ||
      (a.v[1] >= a.v[0] ? 'Diastolic should be lower than systolic.' : '')
    );
  if (['wt', 'sl', 'hr', 'aw'].includes(a.t)) return rangeMsg(a.t, a.v, false);
  if (a.t === 'water' && a.v > 64) return `Water ${a.v} oz looks high.`;
  if (a.t === 'meal' && (a.v.k > 3500 || a.v.k < 20)) return `Meal ${a.v.k} kcal looks off.`;
  return '';
}
let warn: any = null;
const warnHTML = () =>
  warn
    ? `<div class=al role=alert>${esc(warn.msg)} <button class=lk data-a=wkeep>Keep ${esc(String(warn.v))}</button> <button class=lk data-a=wfix>Re-enter</button></div>`
    : '';
function setK(k, v) {
  const d = JSON.parse(JSON.stringify(mem['d-' + date] || {})),
    p = k.split('.');
  let o = d;
  for (let i = 0; i < p.length - 1; i++) {
    o[p[i]] = o[p[i]] || (isNaN(p[i + 1]) ? {} : []);
    o = o[p[i]];
  }
  o[p[p.length - 1]] = v;
  put('d-' + date, d);
}
const val = (d, k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), d),
  inp = (d, k, ph) =>
    `<input type=number inputmode=decimal data-k="${k}" placeholder="${ph}" value="${val(d, k) ?? ''}">`;
function todayV() {
  const d = mem['d-' + date] || {},
    c = d.c || {},
    it = items(date, edit),
    cw = curWin(),
    fw = focusWin();
  let h = '';
  Wn.forEach((w, i) => {
    const xs = it.filter((x) => x.w === i);
    if (!xs.length) return;
    const live = xs.filter((x) => !x.hid),
      dn = live.filter((x) => c[x.id]).length,
      o = opn.has(i);
    h += `<div class="win ${dn === live.length && live.length ? 'fin' : ''} ${i === fw ? 'foc' : ''}"><button class="wh ${i === cw ? 'now' : ''}" data-a=o data-v=${i}><time>${w[0]}</time><span>${w[1]}${((d.ws || {})[i] || {}).s && d.ws[i].s !== 'taken' ? ' <small class=sm>(' + d.ws[i].s + ')</small>' : ''}</span><em class="${dn === live.length && live.length ? 'ok' : ''}">${dn === live.length && live.length ? '&#10003;' : dn + '/' + live.length}</em></button>`;
    if (o) {
      xs.forEach((x) => {
        h += edit
          ? `<div class="r ${x.hid ? 'hd' : ''}"><input type=text class=ei data-lb=${x.id} value="${esc(x.l)}"><button data-a=h data-v=${x.id}>${x.hid ? 'Show' : 'Hide'}</button></div><div class=dc>${[0, 1, 2, 3, 4, 5, 6].map((n) => `<button data-a=sd data-v="${x.id}|${n}" class="${sch(x).includes(n) ? 'on' : ''}">${'SMTWTFS'[n]}</button>`).join('')}</div>`
          : `<label class="r ${c[x.id] ? 'dn' : ''}"><input type=checkbox data-c=${x.id} ${c[x.id] ? 'checked' : ''}><span>${esc(x.l)}</span></label>`;
      });
      if (!edit && dn < live.length)
        h += `<div style="padding:4px 0 8px"><button class=lk data-a=wall data-v=${i}>Check all (${live.length - dn} left)</button></div>`;
    }
    h += '</div>';
  });
  return (
    nudgeHTML(d) +
    quickRow() +
    alertHTML() +
    eveCard() +
    wrNudge() +
    dueCard() +
    (cfg().sick
      ? '<div class=al>Sick-day mode is on. Check your hold list in Vitals and contact your prescriber about what to pause.</div>'
      : '') +
    (cfg().draw && days2(iso(new Date()), cfg().draw) <= 3 && days2(iso(new Date()), cfg().draw) >= 0
      ? '<div class=al>Blood draw within 3 days: hold supplements starting 72 hours before.</div>'
      : '') +
    '<button class=lk data-a=xa style="margin:8px 0">Expand or collapse all</button>' +
    (edit
      ? '<p class=ht>Edit mode: hide items you no longer take. Hidden items stay out of your totals.</p>'
      : '') +
    h
  );
}
// ---- Evening wind-down: the pre-bed and sleep windows on one card ----
const EVE = [9, 10],
  nowMin = () => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  },
  winMin = (i: number) => {
    const [a, b] = Wn[i][0].split(':');
    return +a * 60 + +b;
  };
function loTxt() {
  const r = winMin(10) - nowMin();
  return r > 0
    ? 'Lights out in ' + (r >= 60 ? Math.floor(r / 60) + ' h ' : '') + (r % 60) + ' min'
    : 'Past lights-out time (' + Wn[10][0] + ')';
}
function eveCard() {
  if (date !== iso(new Date()) || nowMin() < winMin(9) - 60) return '';
  const d = mem['d-' + date] || {},
    c = d.c || {},
    it = items(date, false).filter((x) => EVE.includes(x.w as number)),
    left = it.filter((x) => !c[x.id]).length;
  if (!it.length || !left) return '';
  return `<div class=card><h3>Evening wind-down</h3><p class=sm><b id=lo>${loTxt()}</b>. ${left} item${left > 1 ? 's' : ''} left.</p>${it
    .map(
      (x) =>
        `<label class="r ${c[x.id] ? 'dn' : ''}"><input type=checkbox data-c=${x.id} ${c[x.id] ? 'checked' : ''}><span>${esc(x.l)}</span></label>`,
    )
    .join(
      '',
    )}<div class=vb><button class=btn data-a=wev>Check all and lights out</button></div><p class=sm>${d.bt ? 'Bedtime logged: ' + d.bt + '.' : 'This also logs your bedtime as now.'}</p></div>`;
}
setInterval(() => {
  const e = $('#lo');
  if (e) e.textContent = loTxt();
}, 30000);
function bpFlag(d) {
  const s = ['am', 'pm', 'ev'].map((k) => val(d, 'bp.' + k + '.0')).filter((x) => x !== '' && x != null),
    m = Math.min(...s);
  if (!s.length) return '';
  return m < 100
    ? '<div class=al>Systolic under 100. If you feel lightheaded, sit down, drink fluids, and contact your prescriber.</div>'
    : m < 110
      ? '<div class=al>Systolic under 110. Check your protocol for dose-adjustment rules at this level and confirm with your prescriber.</div>'
      : '';
}
function vitalsV() {
  const d = mem['d-' + date] || {};
  return `${vbar('vitals', 'Say or type: BP 118 over 72')}<div class=card><h3>Blood pressure</h3>${[
    ['am', 'Morning'],
    ['pm', '2 PM'],
    ['ev', 'Evening'],
  ]
    .map(
      ([k, l]) =>
        `<div class=g><span>${l}</span>${inp(d, 'bp.' + k + '.0', 'Sys')}${inp(d, 'bp.' + k + '.1', 'Dia')}</div>`,
    )
    .join('')}${bpFlag(d)}<p class=sm>Protocol target: 115-122 / 65-75.</p></div>
${alertHTML()}${sickCard()}${injCard(d)}<div class=card><h3>Symptoms</h3><div class=chips>${SY.map((s) => `<button data-a=sy data-v="${s}" class="${(d.sy || []).includes(s) ? 'on' : ''}">${s}</button>`).join('')}</div>${symFlag(d)}</div>${bodyCard(d)}${sleepCard(d)}<div class=card><h3>Body and energy</h3><div class=g style="grid-template-columns:1fr 1fr 1fr"><div><label class=f>Weight (lb)</label>${inp(d, 'wt', 'lb')}</div><div><label class=f>Resting HR</label>${inp(d, 'hr', 'bpm')}</div><div><label class=f>Waist (in)</label>${inp(d, 'wc', 'in')}</div></div>
<label class=f>Energy</label><div class=en>${[1, 2, 3, 4, 5].map((n) => `<button data-a=e data-v=${n} class="${d.en === n ? 'on' : ''}">${n}</button>`).join('')}</div><label class=f>Notes (symptoms, dizziness, training, appetite)</label><textarea rows=4 data-k=nt>${esc(d.nt || '')}</textarea></div>`;
}
let fres: { d: string; why: string }[] | null = null,
  fq = '';
function runFind() {
  fq = (($('#fq') as HTMLInputElement) || { value: fq }).value.trim();
  const q = fq.toLowerCase();
  fres = [];
  if (!q) return;
  Object.keys(mem)
    .filter((k) => k.startsWith('d-'))
    .sort()
    .reverse()
    .forEach((k) => {
      const D = mem[k],
        sy = (D.sy || []).find((s) => s.toLowerCase().includes(q)),
        nu = (D.nu || []).find((x) => String(x.n).toLowerCase().includes(q)),
        why = (D.nt || '').toLowerCase().includes(q)
          ? 'Note: ' + D.nt.slice(0, 60)
          : sy
            ? 'Symptom: ' + sy
            : nu
              ? 'Meal: ' + nu.n
              : '';
      if (why) fres!.push({ d: k.slice(2), why });
    });
}
function findCard() {
  return `<div class=card><h3>Find a day</h3><div class=g style="grid-template-columns:1fr auto"><input type=date id=fd value="${date}" aria-label="Jump to date"><button class=btn data-a=fgo>Go</button></div><div class=g style="grid-template-columns:1fr auto"><input type=text id=fq value="${esc(fq)}" placeholder="Search notes and symptoms" aria-label="Search notes, symptoms, meals"><button class=btn data-a=fsr>Search</button></div>${
    fres
      ? fres.length
        ? fres
            .slice(0, 12)
            .map(
              (r) =>
                `<div class=r><span>${r.d.slice(5)} <small class=sm>${esc(r.why)}</small></span><button data-a=cd data-v=${r.d}>Open</button></div>`,
            )
            .join('')
        : '<p class=sm>No matches.</p>'
      : ''
  }</div>`;
}
function histV() {
  const ks = Object.keys(mem)
    .filter((k) => k.startsWith('d-'))
    .sort()
    .reverse()
    .slice(0, 14);
  if (!ks.length)
    return '<div class=card>No days logged yet. Check off items on the Today tab to start your history.</div>';
  return `${weekly()}${stats(ks)}${trendCard()}${titrCard()}${calCard()}${awakeCard()}${findCard()}<div class=card><h3>Last ${ks.length} logged days</h3><table><tr><th>Day</th><th>Type</th><th>Done</th><th>Avg sys</th><th>Sleep</th></tr>${ks
    .map((k) => {
      const s = k.slice(2),
        d = mem[k],
        [a, b] = prog(s),
        sy = ['am', 'pm', 'ev'].map((x) => val(d, 'bp.' + x + '.0')).filter((x) => x !== '' && x != null);
      return `<tr><td>${s.slice(5)}${d.dn ? ' &#10003;' : ''}</td><td>${typeOf(s) === 'L' ? 'Lift' : 'Rest'}</td><td>${b ? Math.round((100 * a) / b) : 0}%</td><td>${sy.length ? Math.round(sy.reduce((x, y) => x + y, 0) / sy.length) : '-'}</td><td>${d.sl ?? '-'}</td></tr>`;
    })
    .join('')}</table></div>`;
}
function cloudCard() {
  if ((window as any).DAILY_STANDALONE)
    return `<div class=card><h3>Cloud backup</h3><p class=sm>Cloud backup works when Daily is opened inside Claude. In this app, use Backup below now and then, and keep the file somewhere safe: it restores everything except photos.</p></div>`;
  const C = window.Cloud;
  if (!C) return '';
  const s = C.st,
    ago = s.at
      ? (() => {
          const m = Math.round((Date.now() - s.at) / 60000);
          return m < 1
            ? 'just now'
            : m < 60
              ? m + ' min ago'
              : m < 1440
                ? Math.round(m / 60) + ' h ago'
                : Math.round(m / 1440) + ' days ago';
        })()
      : null;
  return `<div class=card><h3>Cloud backup</h3><p class=sm>${ago ? 'Last cloud copy: ' + ago + ' (' + s.keys + ' items).' : s.checked ? 'No cloud copy yet.' : 'Checking...'} Saves automatically a few minutes after you make changes. Photos are not included.</p><button class=btn data-a=cbk ${s.busy ? 'disabled' : ''}>Back up now</button> <button class=lk data-a=cvf ${s.busy ? 'disabled' : ''}>Verify backup</button> <button class=lk data-a=crs ${s.busy ? 'disabled' : ''}>${s.confirm ? 'Confirm restore' : 'Restore from cloud'}</button>${s.msg ? `<p class=sm role=status>${esc(s.msg)}</p>` : ''}</div>`;
}
let persisted: boolean | null = null;
try {
  navigator.storage &&
    navigator.storage.persisted &&
    navigator.storage.persisted().then((x) => (persisted = x));
} catch (e) {}
const fxAuto = () => {
  try {
    return localStorage.getItem('fxauto');
  } catch (e) {
    return null;
  }
};
function customCard() {
  const cu = cfg().custom || [];
  return `<div class=card><h3>Customize</h3><button class=btn data-a=ed>${edit ? 'Finish editing' : 'Hide or show items'}</button>
<label class=f>Add your own item</label><select id=cw>${Wn.map((w, i) => `<option value=${i}>${w[0]} ${w[1]}</option>`).join('')}</select><input type=text id=cl placeholder="Item and dose" style="margin-top:8px"><select id=ct style="margin-top:8px"><option value=A>Every day</option><option value=L>Lifting days only</option><option value=R>Recovery days only</option></select><select id=cdy style="margin-top:8px" aria-label="Which days"><option value="">Every day of the week</option><option value=wd>Weekdays (Mon to Fri)</option><option value=mt>Mondays and Thursdays</option><option value=mo>Mondays only</option></select><button class=btn data-a=add style="margin-top:8px">Add item</button>
${cu.map((x, i) => `<div class=r><span>${esc(x.l)} <small class=sm>(${Wn[x.w][0]}${x.d ? ', ' + ({ wd: 'weekdays', mt: 'Mon and Thu', mo: 'Mondays' } as any)[x.d] : ''})</small></span><button data-a=del data-v=${i}>Remove</button></div>`).join('')}</div>`;
}
function sumCard() {
  return `<div class=card><h3>Summary for your prescriber</h3><p class=sm>Last 14 logged days: adherence, BP, sleep, symptoms, and labs.</p><button class=btn data-a=sum>Generate summary</button> <button class=btn data-a=pdf>Save 1-page PDF</button>${sumT ? `<textarea rows=12 readonly style="margin-top:10px">${esc(sumT)}</textarea><button class=lk data-a=sdl>Save as text file</button>` : ''}</div>`;
}
function dataCard() {
  return `<div class=card><h3>Data</h3><button class=btn data-a=csv>Export CSV</button> <button class=btn data-a=bk>Backup</button> <button class=btn data-a=tc>Transfer code</button>${tcode ? `<textarea id=tcv rows=3 readonly style="margin-top:10px">${esc(tcode)}</textarea>` : ''}<textarea id=rs rows=2 placeholder="Paste a backup to restore" style="margin-top:10px"></textarea><button class=lk data-a=rs>Restore from pasted backup</button><p class=sm>${mode === 'local' ? 'Saved in the local database on this device. Use Backup to move it.' : mode === 'unsaved' ? 'Last save failed. Reload and try again.' : 'Saved on this device only.'}</p>${persisted === true ? '<p class=sm>Browser storage protection: on.</p>' : persisted === false ? '<p class=sm>Browser storage protection: off. The browser may clear data when space is low, so ' + ((window as any).DAILY_STANDALONE ? 'download a backup now and then.' : 'keep cloud backups on.') + '</p>' : ''}<p class=sm>A tracking log, not medical advice. Bring changes to your prescriber.</p></div>`;
}
let secs = new Set<string>();
function sec(id: string, title: string, sum: string, body: () => string) {
  const o = secs.has(id);
  return `<div class=sec><button class="sech ${o ? 'open' : ''}" data-a=sec data-v=${id} aria-expanded=${o}><span><b>${title}</b><small>${sum}</small></span><i aria-hidden=true>&#8250;</i></button>${o ? body() : ''}</div>`;
}
function moreV() {
  const R0 = (mem.labs || {}).r || [],
    latest = {};
  R0.slice()
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .forEach((x) => (latest[x.m] = x));
  const nm = Object.keys(latest).length,
    fl = Object.values(latest).filter(
      (x: any) => LAB[x.m] && (x.v < LAB[x.m][0] || x.v > LAB[x.m][1]),
    ).length,
    nd = cfg().draw ? days2(iso(new Date()), cfg().draw) : null,
    t0 = iso(new Date()),
    nv = ((mem.vials || {}).r || []).length,
    ns = ((mem.sup || {}).r || []).length,
    na = all().filter((x) => actF(x) && actF(x) > t0).length,
    ca = window.Cloud && window.Cloud.st.at ? agoTxt(window.Cloud.st.at) : null;
  return (
    sec(
      'health',
      'Health and labs',
      `${nm} marker${nm === 1 ? '' : 's'}${fl ? ' - ' + fl + ' flagged' : ''}${nd != null && nd >= 0 ? ' - draw in ' + nd + ' days' : ''}`,
      () => labsCard() + labImpCard() + alertCard() + doseCard() + chgCard() + expCard() + procCard(),
    ) +
    sec(
      'supply',
      medsOn() ? 'Supplies and peptides' : 'Supplies',
      `${ns} suppl${ns === 1 ? 'y' : 'ies'}${medsOn() ? ' - ' + nv + ' vial' + (nv === 1 ? '' : 's') : ''}${na ? ' - ' + na + ' arriving' : ''}`,
      () => suppCard2() + (medsOn() ? vialCard() : '') + arrCard() + (medsOn() ? cycCard() : ''),
    ) +
    sec(
      'reports',
      'Reports and backup',
      (window as any).DAILY_STANDALONE ? 'Summary, CSV and backup file' : ca ? 'Cloud copy ' + ca : 'No cloud copy yet',
      () => sumCard() + cloudCard() + dataCard(),
    ) +
    sec(
      'settings',
      'Customize and settings',
      'Hide items, theme, PIN, effects, version notes',
      () => customCard() + setCard() + verCard(),
    )
  );
}
const agoTxt = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1
    ? 'just now'
    : m < 60
      ? m + ' min ago'
      : m < 1440
        ? Math.round(m / 60) + ' h ago'
        : Math.round(m / 1440) + ' days ago';
};
function spark(a) {
  if (a.length < 2) return '';
  const mn = Math.min(...a),
    mx = Math.max(...a),
    r = mx - mn || 1;
  return `<svg viewBox="0 0 180 40" class=sp><polyline points="${a.map((v, i) => ((i * 180) / (a.length - 1)).toFixed(1) + ',' + (36 - ((v - mn) / r) * 32).toFixed(1)).join(' ')}"/></svg>`;
}
function stats(ks) {
  const pc = ks.slice(0, 7).map((k) => {
      const [a, b] = prog(k.slice(2));
      return b ? (100 * a) / b : 0;
    }),
    av = pc.length ? Math.round(pc.reduce((x, y) => x + y, 0) / pc.length) : 0;
  let st = 0;
  for (const k of ks) {
    if (mem[k].dn) st++;
    else break;
  }
  const sy = ks
    .slice()
    .reverse()
    .map((k) => {
      const v = ['am', 'pm', 'ev']
        .map((x) => val(mem[k], 'bp.' + x + '.0'))
        .filter((x) => x !== '' && x != null);
      return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null;
    })
    .filter((x) => x != null);
  return `<div class=stat><div><b>${av}%</b><span>7-day adherence</span></div><div><b>${st}</b><span>day streak</span></div><div>${spark(sy)}<span>Avg systolic</span></div></div><div class=stat style="grid-template-columns:1fr 1fr 1fr"><div>${spark(
    ks
      .slice()
      .reverse()
      .map((k) => mem[k].wt)
      .filter(Boolean),
  )}<span>Weight</span></div><div>${spark(
    ks
      .slice()
      .reverse()
      .map((k) => mem[k].sl)
      .filter(Boolean),
  )}<span>Sleep</span></div><div>${spark(
    ks
      .slice()
      .reverse()
      .map((k) => mem[k].wc)
      .filter(Boolean),
  )}<span>Waist</span></div></div>`;
}
// In-range count and draw status above the lab table.
function labSummary(g: Record<string, any[]>) {
  const L = Object.entries(g).map(([m, a]) => {
      const l = a.slice().sort((x, y) => (x.d < y.d ? -1 : 1))[a.length - 1];
      return { m, l, rg: LAB[m] };
    }),
    rated = L.filter((x) => x.rg),
    out = rated.filter((x) => x.l.v < x.rg[0] || x.l.v > x.rg[1]),
    nd = cfg().draw ? days2(iso(new Date()), cfg().draw) : null;
  return `<p class=sm>${rated.length ? `${rated.length - out.length} of ${rated.length} markers in the typical range${out.length ? '. Outside: ' + out.map((x) => esc(x.m)).join(', ') : ''}.` : ''} ${nd == null ? '' : nd < 0 ? `Next draw is ${-nd} days overdue.` : nd <= 14 ? `Next draw in ${nd} days.` : ''}</p>`;
}
// What changed between the last two draws of one marker: dose changes and journal entries.
function labCtx(a: any[]) {
  const s = a.slice().sort((x, y) => (x.d < y.d ? -1 : 1));
  if (s.length < 2) return '<p class=sm>One result so far. Add another draw to see a trend.</p>';
  const p = s[s.length - 2],
    l = s[s.length - 1],
    ev = allMarks().filter((e) => e.d > p.d && e.d <= l.d);
  return `<p class=sm>Between ${p.d.slice(5)} and ${l.d.slice(5)}: ${ev.length ? ev.map((e) => esc(e.t) + ' (' + e.d.slice(5) + ')').join('; ') : 'no logged changes'}.</p>`;
}
function labsCard() {
  const R = (mem.labs || {}).r || [],
    g = {};
  R.forEach((x) => (g[x.m] = g[x.m] || []).push(x));
  const rows = Object.entries(g)
    .map(([m, a]) => {
      a.sort((x, y) => (x.d < y.d ? -1 : 1));
      const l = a[a.length - 1],
        p = a[a.length - 2],
        dl = p ? l.v - p.v : 0;
      const rg = LAB[m],
        fl = rg ? (l.v < rg[0] ? ' &#9660;' : l.v > rg[1] ? ' &#9650;' : '') : '';
      const pct = p && p.v ? Math.round((100 * dl) / p.v) : null;
      return `<tr><td><button class=lnk data-a=ls data-v="${esc(m)}">${esc(m)}</button><br><small class=sm>${rg ? rg[0] + '-' + rg[1] + ' · ' : ''}${l.d.slice(5)}${p ? ' · +' + days2(p.d, l.d) + 'd' : ''}</small></td><td${fl ? ' style="color:var(--nw);font-weight:600"' : ''}>${l.v}${fl}</td><td>${p ? (dl > 0 ? '&#9650; ' : dl < 0 ? '&#9660; ' : '') + Math.abs(+dl.toFixed(2)) + (pct != null ? ` <small class=sm>${pct > 0 ? '+' : ''}${pct}%</small>` : '') : ''}</td><td>${spark(a.map((x) => x.v))}</td></tr>`;
    })
    .join('');
  return `<div class=card><h3>Labs</h3>${
    rows
      ? `${labSummary(g)}<table><tr><th>Marker</th><th>Latest</th><th>Change</th><th>Trend</th></tr>${rows}</table><p class=sm style="margin:8px 0">Tap a marker for its chart.</p>${
          labSel && g[labSel]
            ? chart(
                g[labSel]
                  .slice()
                  .sort((a, b) => (a.d < b.d ? -1 : 1))
                  .map((x) => ({ x: x.d, y: x.v })),
                { band: LAB[labSel], marks: allMarks() },
              ) + labCtx(g[labSel])
            : ''
        }`
      : '<p class=sm>Log AST, ALT, GGT, ApoB, hematocrit, PSA, IGF-1 and more to track changes over time.</p>'
  }<input type=text id=lm list=lms placeholder="Marker" style="margin-top:10px"><datalist id=lms>${['AST', 'ALT', 'GGT', 'A1c', 'Fasting glucose', 'ApoB', 'LDL', 'Hematocrit', 'PSA', 'IGF-1', 'Cystatin C', 'Potassium', '25-OH D', 'B12', 'Ferritin'].map((x) => `<option>${x}</option>`).join('')}</datalist><div class=g style="grid-template-columns:1fr 1fr"><input type=number inputmode=decimal id=lv placeholder="Value"><input type=date id=ld value="${iso(new Date())}"></div><button class=btn data-a=lab>Add result</button> <button class=lk data-a=lu>Undo last</button><label class=f>Next blood draw</label><div class=g style="grid-template-columns:1fr 1fr"><input type=date id=nd value="${cfg().draw || ''}"><select id=ni>${[4, 6, 8, 12, 16].map((n) => `<option ${(cfg().dint || 12) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div><p class=sm>${drawTxt()}</p><button class=btn data-a=dr>Save draw date</button><p class=sm>Typical adult ranges shown. Use your lab's ranges.</p></div>`;
}
const SY = [
    'Dizziness',
    'Nausea',
    'GI upset',
    'Headache',
    'Palpitations',
    'Bruising or bleeding',
    'Swelling',
  ],
  sch = (x) =>
    (cfg().sch || {})[x.id] ||
    (x.d === 'wd' ? [1, 2, 3, 4, 5] : x.d === 'mt' ? [1, 4] : x.d === 'mo' ? [1] : [0, 1, 2, 3, 4, 5, 6]);
function symFlag(d) {
  const s = d.sy || [];
  return s.includes('Bruising or bleeding')
    ? '<div class=al>Unusual bruising or bleeding: your stack includes several blood-thinning supplements. Contact your prescriber.</div>'
    : s.includes('Palpitations')
      ? '<div class=al>Palpitations are worth mentioning to your prescriber.</div>'
      : s.includes('Dizziness')
        ? '<div class=al>Dizziness on BP medications: check your reading, sit down, and hydrate. Tell your prescriber if it keeps happening.</div>'
        : '';
}
function suppCard() {
  const R = (mem.sup || {}).r || [];
  return `<div class=card><h3>Supplies</h3>${R.map((x, i) => `<div class=r><span>${esc(x.n)}${x.o ? ' <small class=sm>opened ' + esc(x.o) + '</small>' : ''}${x.c <= 2 ? ' <small style="color:var(--nw)">low</small>' : ''}</span><button data-a=sm data-v="${i}|-1">-</button><b>${x.c}</b><button data-a=sm data-v="${i}|1">+</button><button data-a=sx data-v=${i}>Remove</button></div>`).join('') || '<p class=sm>Track vials and stock, such as peptide vials or syringes.</p>'}<div class=g style="grid-template-columns:2fr 1fr"><input type=text id=sn placeholder="Item"><input type=number id=sc placeholder="Count"></div><input type=text id=so placeholder="Opened date (optional)" style="margin-bottom:8px"><button class=btn data-a=sa>Add item</button></div>`;
}
const SQ = ['Abdomen L', 'Abdomen R', 'Thigh L', 'Thigh R', 'Deltoid L', 'Deltoid R'],
  IMS = ['Glute L', 'Glute R', 'Deltoid L', 'Deltoid R'];
let sumT = '';
/** Peptide and injection panels (vials, cycle) appear once the regimen has an injectable item or vials are logged. */
const medsOn = () => all().some((x) => isInj(x) && !(cfg().hide || {})[x.id]) || ((mem.vials || {}).r || []).length > 0;
const isInj = (x) => /SubQ|\bIM\b/.test(x.l),
  PEP = /peptide/i,
  ABD = ['Abdomen L', 'Abdomen R'],
  // peptides go in the abdominal fat pad; other injectables rotate thigh, abdomen and deltoid.
  sitesFor = (x) => (/\bIM\b/.test(x.l) ? IMS : PEP.test(x.l) ? ABD : SQ);
function lastSite(id, before) {
  const k = Object.keys(mem)
    .filter((k) => k.startsWith('d-') && k.slice(2) < before && mem[k].inj && mem[k].inj[id])
    .sort()
    .pop();
  return k ? mem[k].inj[id] : null;
}
// ---- Dose planner: what is due next, plus a log of dose changes ----
const medName = (l: string) => {
  const o: string[] = [];
  for (const t of l.split(/\s+/)) {
    if (/^[\d(]/.test(t)) break;
    o.push(t);
  }
  return (o.join(' ') || l).replace(/[,:]+$/, '');
};
const dayLbl = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
function isPlanned(x) {
  if (isInj(x)) return true;
  const sc = (cfg().sch || {})[x.id];
  return sc ? sc.length < 7 : !!x.d;
}
// Doses a few days apart (weekly or twice weekly) are the ones where a miss matters.
const sparse = (x) => {
  const sc = (cfg().sch || {})[x.id];
  return sc ? sc.length <= 2 : x.d === 'mo' || x.d === 'mt';
};
function nextDue(x, today: string) {
  const taken = ((mem['d-' + today] || {}).c || {})[x.id];
  for (let n = taken ? 1 : 0; n <= 14; n++) {
    const s = addD(today, n);
    if (dueOn(x, s)) return { s, n };
  }
  return null;
}
// Latest scheduled day in the past week that was logged but not taken or skipped.
function missedDue(x, today: string) {
  for (let n = 1; n <= 7; n++) {
    const s = addD(today, -n);
    if (!dueOn(x, s)) continue;
    const D = mem['d-' + s];
    if (!D || (D.c && D.c[x.id]) || ((D.ws || {})[x.w] || {}).s === 'skipped') return null;
    return s;
  }
  return null;
}
function lastTaken(id: string) {
  const k = Object.keys(mem)
    .filter((k) => k.startsWith('d-') && mem[k].c && mem[k].c[id])
    .sort()
    .pop();
  return k ? { s: k.slice(2), dose: ((mem[k].dose || {})[id] || {}).v || '' } : null;
}
const doseLog = (): any[] => (mem.dh || {}).r || [];
function recentChange(l: string, today: string) {
  const n = medName(l).toLowerCase();
  return doseLog()
    .filter((e) => e.m.toLowerCase() === n && days2(e.d, today) >= 0 && days2(e.d, today) <= 60)
    .sort((a, b) => (a.d < b.d ? 1 : -1))[0];
}
function dueCard() {
  const today = iso(new Date());
  if (date !== today) return '';
  const h = cfg().hide || {},
    rows0 = all()
      .filter((x) => isPlanned(x) && !h[x.id])
      .map((x) => ({ x, nd: nextDue(x, today), md: isInj(x) && sparse(x) ? missedDue(x, today) : null }))
      .filter((r) => r.nd)
      .sort(
        (a, b) =>
          a.nd!.n - b.nd!.n || Number(isInj(b.x)) - Number(isInj(a.x)) || Number(a.x.w) - Number(b.x.w),
      )
      .filter((r) => isInj(r.x) || r.nd!.n <= 2);
  // Injections always make the list; everyday scheduled items fill the rest, up to four rows.
  const inj = rows0.filter((r) => isInj(r.x)),
    rows = rows0.filter((r) => inj.includes(r) || rows0.filter((q) => !isInj(q.x)).indexOf(r) < Math.max(0, 4 - inj.length));
  if (!rows.length) return '';
  return `<div class=card><h3>Up next</h3>${rows
    .map(({ x, nd, md }) => {
      const lt = lastTaken(x.id),
        rc = recentChange(x.l, today),
        when = nd!.n === 0 ? 'Today ' + Wn[x.w][0] : nd!.n === 1 ? 'Tomorrow' : dayLbl(nd!.s),
        sub = [
          isInj(x) ? (lt ? 'last ' + dayLbl(lt.s) + (lt.dose ? ', ' + lt.dose : '') : 'not logged yet') : '',
          rc ? 'dose changed ' + rc.d.slice(5) + ': ' + rc.f + ' to ' + rc.t : '',
        ]
          .filter(Boolean)
          .join(' - ');
      return `<div class=dz><span><b>${esc(medName(x.l))}</b><small class=sm>${esc(sub)}</small>${md ? `<small class="sm miss">Missed ${dayLbl(md)}. Check your prescriber's missed-dose guidance.</small>` : ''}</span><em class="${nd!.n === 0 ? 'now' : ''}">${when}</em></div>`;
    })
    .join('')}</div>`;
}
function doseCard() {
  const R = doseLog()
      .slice()
      .sort((a, b) => (a.d < b.d ? 1 : -1)),
    names = Array.from(
      new Set(
        all()
          .filter(isPlanned)
          .map((x) => medName(x.l)),
      ),
    );
  return `<div class=card><h3>Dose changes</h3><p class=sm>Log dose changes, for supplements or medications, so they show on your trend charts.</p><datalist id=dlm>${names.map((n) => `<option>${esc(n)}</option>`).join('')}</datalist>${R.slice(
    0,
    8,
  )
    .map(
      (e, i) =>
        `<div class=r><span>${e.d.slice(5)} ${esc(e.m)}: ${esc(e.f)} to ${esc(e.t)}${e.y ? '<br><small class=sm>' + esc(e.y) + '</small>' : ''}</span><button data-a=dlx data-v="${doseLog().indexOf(e)}" aria-label="Remove dose change">Remove</button></div>`,
    )
    .join(
      '',
    )}<input type=text id=dlm1 list=dlm placeholder="Medication" style="margin-top:8px"><div class=g style="grid-template-columns:1fr 1fr"><input type=text id=dlf placeholder="From (2.5 mg)" aria-label="Previous dose"><input type=text id=dlt placeholder="To (5 mg)" aria-label="New dose"></div><label class=f>Date of change</label><input type=date id=dld value="${iso(new Date())}" aria-label="Date of change"><input type=text id=dly placeholder="Reason (optional)" style="margin-top:8px"><label class=f style="display:flex;gap:8px;align-items:center"><input type=checkbox id=dlr checked style="width:auto"> Set a lab recheck in 6 weeks</label><button class=btn data-a=dla style="margin-top:8px">Log change</button></div>`;
}
function injCard(d) {
  const xs = items(date, false).filter(isInj);
  if (!xs.length) return '';
  return `<div class=card><h3>Injection sites</h3><p class=sm>A dot marks the suggested next site.</p>${xs
    .map((x) => {
      const S = sitesFor(x),
        l = lastSite(x.id, date),
        nx = l ? S[(S.indexOf(l) + 1) % S.length] : S[0],
        cur = (d.inj || {})[x.id];
      return `<div class=sm style="color:var(--tx)">${esc(x.l.split(' (')[0])}</div><div class=inj>${S.map((s) => `<button data-a=is data-v="${x.id}|${s}" class="${cur === s ? 'on' : ''} ${s === nx && !cur ? 'nx' : ''}">${s === nx && !cur ? '&bull; ' : ''}${s}</button>`).join('')}</div><div class=g style="grid-template-columns:1fr auto"><input type=text data-ds=${x.id} placeholder="${esc(planned(x.l))}" value="${esc(((d.dose || {})[x.id] || {}).v || '')}"><button class=lk data-a=dn data-v=${x.id}>${((d.dose || {})[x.id] || {}).t ? 'at ' + d.dose[x.id].t : 'Now'}</button></div>`;
    })
    .join('')}</div>`;
}
function reportModel() {
  const ks = Object.keys(mem)
      .filter((k) => k.startsWith('d-'))
      .sort()
      .slice(-30),
    avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null),
    num = (x) => x !== '' && x != null && !isNaN(x);
  const days = ks.map((k) => {
    const d = mem[k],
      sy = ['am', 'pm', 'ev'].map((x) => val(d, 'bp.' + x + '.0')).filter(num),
      di = ['am', 'pm', 'ev'].map((x) => val(d, 'bp.' + x + '.1')).filter(num);
    return { sys: avg(sy), dia: avg(di), wt: num(d.wt) ? +d.wt : null, sl: num(d.sl) ? +d.sl : null };
  });
  const bp = ks.flatMap((k) =>
      ['am', 'pm', 'ev']
        .map((x) => [val(mem[k], 'bp.' + x + '.0'), val(mem[k], 'bp.' + x + '.1')])
        .filter((q) => num(q[0])),
    ),
    pc = ks.map((k) => {
      const [a, b] = prog(k.slice(2));
      return b ? (100 * a) / b : 0;
    }),
    wts = days.map((d) => d.wt).filter((x) => x != null),
    sls = days.map((d) => d.sl).filter((x) => x != null),
    aws = ks.map((k) => mem[k].aw).filter(num),
    sy = {};
  ks.forEach((k) => (mem[k].sy || []).forEach((s) => (sy[s] = (sy[s] || 0) + 1)));
  const g = {};
  ((mem.labs || {}).r || []).forEach((x) => (g[x.m] = g[x.m] || []).push(x));
  const labs = Object.entries(g).map(([m, a]: [string, any]) => {
    a.sort((x, y) => (x.d < y.d ? -1 : 1));
    const l = a[a.length - 1],
      pr = a[a.length - 2],
      rg = LAB[m];
    return {
      m,
      v: l.v,
      d: l.d,
      chg: pr ? l.v - pr.v : null,
      lo: rg ? rg[0] : undefined,
      hi: rg ? rg[1] : undefined,
      flag: rg ? (l.v < rg[0] ? 'LOW' : l.v > rg[1] ? 'HIGH' : '') : '',
    };
  });
  labs.sort((a, b) => (a.flag ? 0 : 1) - (b.flag ? 0 : 1) || a.m.localeCompare(b.m));
  return {
    from: ks.length ? ks[0].slice(2) : '-',
    to: ks.length ? ks[ks.length - 1].slice(2) : '-',
    generated: iso(new Date()),
    nDays: ks.length,
    adherence: avg(pc),
    bpAvg: bp.length ? [avg(bp.map((q) => q[0])), avg(bp.map((q) => q[1]))] : null,
    bpLow: bp.length ? Math.min(...bp.map((q) => q[0])) : null,
    bpN: bp.length,
    sleepAvg: avg(sls),
    weightChange: wts.length > 1 ? wts[wts.length - 1] - wts[0] : null,
    wakesAvg: avg(aws),
    missed: ks.reduce(
      (t, k) => t + Object.values(mem[k].ws || {}).filter((x: any) => x.s !== 'taken').length,
      0,
    ),
    days,
    symptoms: Object.entries(sy).sort((a: any, b: any) => b[1] - a[1]),
    labs,
  };
}
function sumText() {
  const ks = Object.keys(mem)
      .filter((k) => k.startsWith('d-'))
      .sort()
      .reverse()
      .slice(0, 14)
      .reverse(),
    avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : 'n/a'),
    bp = ks.flatMap((k) =>
      ['am', 'pm', 'ev']
        .map((x) => [val(mem[k], 'bp.' + x + '.0'), val(mem[k], 'bp.' + x + '.1')])
        .filter((p) => p[0] !== '' && p[0] != null),
    ),
    pc = ks.map((k) => {
      const [a, b] = prog(k.slice(2));
      return b ? (100 * a) / b : 0;
    }),
    sy = {};
  ks.forEach((k) => (mem[k].sy || []).forEach((s) => (sy[s] = (sy[s] || 0) + 1)));
  const lb = {};
  ((mem.labs || {}).r || []).forEach((x) => {
    if (!lb[x.m] || x.d >= lb[x.m].d) lb[x.m] = x;
  });
  return [
    'PROTOCOL SUMMARY (' +
      (ks[0] || '').slice(2) +
      ' to ' +
      (ks[ks.length - 1] || '').slice(2) +
      ', ' +
      ks.length +
      ' logged days)',
    'Adherence: ' + avg(pc) + '% average',
    'Blood pressure: ' +
      (bp.length
        ? avg(bp.map((p) => p[0])) +
          ' / ' +
          avg(bp.map((p) => p[1])) +
          ' average, lowest systolic ' +
          Math.min(...bp.map((p) => p[0])) +
          ', ' +
          bp.length +
          ' readings'
        : 'none logged'),
    'Weight: ' + avg(ks.map((k) => mem[k].wt).filter(Boolean)) + ' average',
    'Sleep: ' +
      avg(ks.map((k) => mem[k].sl).filter(Boolean)) +
      ' h average; 2-3 AM wakes: ' +
      avg(ks.map((k) => mem[k].aw).filter((x) => x !== '' && x != null)),
    'Symptoms: ' +
      (Object.keys(sy).length
        ? Object.entries(sy)
            .map(([s, n]) => s + ' x' + n)
            .join(', ')
        : 'none logged'),
    'Latest labs: ' +
      (Object.values(lb)
        .map((x) => x.m + ' ' + x.v + ' (' + x.d + ')')
        .join('; ') || 'none logged'),
    '',
    'Self-tracked log, not a medical record.',
  ].join('\n');
}
const days2 = (a, b) => Math.round((+new Date(b + 'T12:00:00') - +new Date(a + 'T12:00:00')) / 864e5);
// ---- Weekly review: any 7-day window compared with the one before it ----
let wkOff = 0;
const avgOf = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null),
  isNum = (x) => x !== '' && x != null && !isNaN(x);
function periodStats(from: string, to: string) {
  const today = iso(new Date()),
    ks = Object.keys(mem)
      .filter((k) => k.startsWith('d-') && k.slice(2) >= from && k.slice(2) <= to)
      .sort(),
    dates: string[] = [];
  for (let s = from; s <= to; s = addD(s, 1)) dates.push(s);
  const pcs = ks.map((k) => {
      const [a, b] = prog(k.slice(2));
      return b ? (100 * a) / b : 0;
    }),
    byWin = Wn.map((_, i) => {
      let tot = 0,
        done = 0;
      ks.forEach((k) => {
        const D = mem[k];
        if (((D.ws || {})[i] || {}).s === 'skipped') return;
        items(k.slice(2), false)
          .filter((x) => x.w === i)
          .forEach((x) => {
            tot++;
            if ((D.c || {})[x.id]) done++;
          });
      });
      return { tot, done, pct: tot ? (100 * done) / tot : null };
    }),
    sysOf = (D) => avgOf(['am', 'pm', 'ev'].map((x) => val(D, 'bp.' + x + '.0')).filter(isNum) as number[]),
    diaOf = (D) => avgOf(['am', 'pm', 'ev'].map((x) => val(D, 'bp.' + x + '.1')).filter(isNum) as number[]),
    allSys = ks.flatMap((k) => ['am', 'pm', 'ev'].map((x) => val(mem[k], 'bp.' + x + '.0')).filter(isNum)),
    wts = ks.map((k) => mem[k].wt).filter(isNum),
    sls = ks.map((k) => mem[k].sl).filter(isNum),
    sy: Record<string, number> = {};
  ks.forEach((k) => (mem[k].sy || []).forEach((q) => (sy[q] = (sy[q] || 0) + 1)));
  const inj = all()
    .filter((x) => isInj(x) && !(cfg().hide || {})[x.id])
    .map((x) => {
      let due = 0,
        taken = 0;
      dates
        .filter((s) => s <= today)
        .forEach((s) => {
          if (!dueOn(x, s)) return;
          due++;
          if (((mem['d-' + s] || {}).c || {})[x.id]) taken++;
        });
      return { n: medName(x.l), due, taken };
    })
    .filter((x) => x.due);
  const lift = window.L_ && L_.rev ? L_.rev(from, to) : null;
  return {
    from,
    to,
    nDays: ks.length,
    adherence: avgOf(pcs),
    lowDays: ks.filter((k, i) => pcs[i] < 60).map((k) => k.slice(2)),
    topDays: pcs.filter((x) => x >= 90).length,
    byWin,
    sys: avgOf(allSys),
    dia: avgOf(ks.map((k) => diaOf(mem[k])).filter((x) => x != null) as number[]),
    lowSys: allSys.length ? Math.min(...allSys) : null,
    bpN: allSys.length,
    sleep: avgOf(sls),
    shortNights: sls.filter((x) => x < 6).length,
    wake: ks.filter((k) => mem[k].aw > 0).length,
    wt: wts.length > 1 ? wts[wts.length - 1] - wts[0] : null,
    protein: avgOf(ks.map((k) => sumN(mem[k], 'p')).filter((x) => x > 0)),
    sy: Object.entries(sy).sort((a, b) => b[1] - a[1]),
    inj,
    lift,
    missedW: ks.reduce(
      (t, k) => t + Object.values(mem[k].ws || {}).filter((x: any) => x.s !== 'taken').length,
      0,
    ),
    days: dates.map((s) => {
      const D = mem['d-' + s];
      return {
        s,
        sys: D ? sysOf(D) : null,
        dia: D ? diaOf(D) : null,
        sl: D && isNum(D.sl) ? +D.sl : null,
        wt: D && isNum(D.wt) ? +D.wt : null,
        pc: D ? prog(s)[1] && (100 * prog(s)[0]) / prog(s)[1] : null,
      };
    }),
  };
}
type Period = ReturnType<typeof periodStats>;
function reviewModel(off: number) {
  const end = addD(iso(new Date()), -7 * off),
    cur = periodStats(addD(end, -6), end),
    prev = periodStats(addD(end, -13), addD(end, -7)),
    slip: string[] = [],
    win: string[] = [],
    day = (s: string) => dayLbl(s).split(',')[0];
  const worst = cur.byWin
    .map((w, i) => ({ i, ...w }))
    .filter((w) => w.tot >= 3 && w.pct != null && w.pct < 80)
    .sort((a, b) => a.pct! - b.pct!)
    .slice(0, 2);
  worst.forEach((w) =>
    slip.push(`${Wn[w.i][1]} was ${Math.round(w.pct!)}% done (${w.done} of ${w.tot} items).`),
  );
  if (cur.lowDays.length) slip.push(`Under 60% on ${cur.lowDays.map(day).join(', ')}.`);
  cur.inj
    .filter((x) => x.taken < x.due)
    .forEach((x) => slip.push(`${x.n}: ${x.taken} of ${x.due} scheduled doses logged.`));
  if (cur.lowSys != null && cur.lowSys < 110)
    slip.push(`Lowest systolic was ${cur.lowSys}. Worth mentioning to your prescriber.`);
  if (cur.shortNights)
    slip.push(`${cur.shortNights} night${cur.shortNights > 1 ? 's' : ''} under 6 h of sleep.`);
  if (cur.nDays < 7) slip.push(`Only ${cur.nDays} of 7 days logged, so averages are rough.`);
  if (cur.adherence != null && prev.adherence != null && cur.adherence < prev.adherence - 5)
    slip.push(`Adherence fell ${Math.round(prev.adherence - cur.adherence)} points from the week before.`);
  if (cur.topDays) win.push(`${cur.topDays} day${cur.topDays > 1 ? 's' : ''} at 90% or better.`);
  if (cur.adherence != null && prev.adherence != null && cur.adherence >= prev.adherence + 5)
    win.push(`Adherence up ${Math.round(cur.adherence - prev.adherence)} points from the week before.`);
  if (cur.sys != null && cur.sys >= 115 && cur.sys <= 125)
    win.push(`Average systolic ${Math.round(cur.sys)} is in your target range.`);
  if (cur.lift && cur.lift.pr.length)
    win.push(
      'New estimated 1RM: ' +
        cur.lift.pr
          .slice(0, 3)
          .map((x) => `${x.n} ${x.v}`)
          .join(', ') +
        '.',
    );
  if (cur.lift && cur.lift.n >= 3) win.push(`${cur.lift.n} lift sessions.`);
  cur.inj.filter((x) => x.taken === x.due).forEach((x) => win.push(`${x.n}: every scheduled dose logged.`));
  return { cur, prev, slip, win, off, times: Wn.map((w) => w[0]), names: Wn.map((w) => w[1]) };
}
const dlt = (a: number | null, b: number | null, u = '', d = 0) =>
  a == null || b == null
    ? ''
    : (() => {
        const v = a - b;
        return Math.abs(v) < Math.pow(10, -d) / 2 ? 'no change' : (v > 0 ? '+' : '') + v.toFixed(d) + u;
      })();
function weekly() {
  const m = reviewModel(wkOff),
    c = m.cur,
    p = m.prev,
    L = c.lift,
    t = (b: string, l: string, sub = '') =>
      `<div><b>${b}</b><span>${l}${sub ? '<br><small>' + sub + '</small>' : ''}</span></div>`;
  return `<div class=card><h3>Weekly review</h3><div class=chips>${['Last 7 days', 'Week before'].map((l, i) => `<button data-a=wro data-v=${i} class="${i === wkOff ? 'on' : ''}">${l}</button>`).join('')}</div><p class=sm>${dayLbl(c.from)} to ${dayLbl(c.to)}. ${c.nDays} of 7 days logged. Small numbers show the change from the 7 days before.</p>
<div class=stat>${t(c.adherence == null ? '-' : Math.round(c.adherence) + '%', 'Adherence', dlt(c.adherence, p.adherence, ' pts'))}${t(c.sys == null ? '-' : Math.round(c.sys) + '/' + Math.round(c.dia || 0), 'Avg BP', dlt(c.sys, p.sys, '', 0))}${t(c.sleep == null ? '-' : c.sleep.toFixed(1) + ' h', 'Avg sleep', dlt(c.sleep, p.sleep, ' h', 1))}</div>
<div class=stat>${t(c.wt == null ? '-' : (c.wt > 0 ? '+' : '') + c.wt.toFixed(1), 'Weight change')}${t(L ? String(L.n) : '-', 'Lift sessions', L && L.n ? Math.round(L.v).toLocaleString() + ' ' + L.u : '')}${t(L ? String(L.pr.length) : '-', 'New PRs')}</div>
<h4 class=sub>Adherence by window</h4>${c.byWin
    .map((w, i) =>
      w.tot
        ? `<div class=wb><span>${Wn[i][0]} ${esc(Wn[i][1])}</span><b>${Math.round(w.pct!)}%</b><div class=mvb><i style="width:${w.pct}%;background:${w.pct! < 80 ? 'var(--nw)' : 'var(--dn)'}"></i></div></div>`
        : '',
    )
    .join(
      '',
    )}${c.inj.length ? `<h4 class=sub>Injections</h4>${c.inj.map((x) => `<div class=sm style="color:var(--tx)">${esc(x.n)}: ${x.taken} of ${x.due} logged</div>`).join('')}` : ''}<h4 class=sub>What slipped</h4>${m.slip.length ? m.slip.map((x) => `<p class="sm rv">${esc(x)}</p>`).join('') : '<p class=sm>Nothing stands out.</p>'}<h4 class=sub>What went well</h4>${m.win.length ? m.win.map((x) => `<p class="sm rv">${esc(x)}</p>`).join('') : '<p class=sm>Log a few more days to see highlights.</p>'}<table style="margin-top:10px"><tr><td>Nights with wakes</td><td>${c.wake} of ${c.nDays}</td></tr><tr><td>Skipped or missed windows</td><td>${c.missedW}</td></tr><tr><td>Avg protein</td><td>${c.protein ? Math.round(c.protein) + ' g' : '-'}</td></tr><tr><td>Cardio minutes</td><td>${L ? L.c : 0}</td></tr></table><button class=btn data-a=wpdf style="margin-top:10px">Save weekly PDF</button></div>`;
}
const wkKey = () => {
  const t = iso(new Date());
  return addD(t, -dow(t));
};
// Sunday evening through Monday: point to the review once per week.
function wrNudge() {
  const t = iso(new Date()),
    w = dow(t);
  if (date !== t || !(w === 0 || w === 1) || cfg().wrSeen === wkKey()) return '';
  return `<div class=wrn><span>Your weekly review is ready</span><span><button class=lk data-a=gwr>Open</button><button class=lk data-a=wrx aria-label="Dismiss">&times;</button></span></div>`;
}
function cycCard() {
  const c = cfg().cyc,
    t = iso(new Date());
  let st = 'No cycle started.';
  if (c) {
    const w = Math.floor(days2(c.s, t) / 7) + 1;
    st = !c.cap
      ? `Week ${w} since start. No cap set, matching your v15.4 protocol.`
      : w <= c.cap
        ? `Week ${w} of ${c.cap}. ${c.cap - w} weeks until washout.`
        : w <= c.cap + c.wo
          ? `Washout week ${w - c.cap} of ${c.wo}.`
          : 'Washout complete. Start a new cycle when ready.';
  }
  return `<div class=card><h3>Peptide cycle</h3><p class=sm>${st}</p><div class=g style="grid-template-columns:1.5fr 1fr .8fr"><input type=date id=cs value="${c ? c.s : t}"><select id=cc>${[0, 12, 14, 16].map((n) => `<option value=${n} ${(c ? c.cap : 0) === n ? 'selected' : ''}>${n || 'No cap'}</option>`).join('')}</select><select id=cw2>${[2, 3, 4].map((n) => `<option value=${n} ${(c ? c.wo : 2) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div><p class=sm>Start date, weeks on (No cap matches v15.4), washout weeks (10 to 14 days is about 2)</p><button class=btn data-a=cy>Save cycle</button></div>`;
}
function chgCard() {
  const R = (mem.chg || {}).r || [],
    t = iso(new Date());
  return `<div class=card><h3>Change journal</h3>${R.map((x, i) => `<div class=r><span>${x.d.slice(5)} ${esc(x.t)}<br><small class=sm>Recheck labs ${x.rc.slice(5)}${x.rc <= t ? ' (due)' : ''}</small></span><button data-a=cx data-v=${i}>Remove</button></div>`).join('') || '<p class=sm>Note changes such as "stopped curcumin" to get a recheck date 6 weeks out.</p>'}<input type=text id=ct2 placeholder="What changed?" style="margin:8px 0"><button class=btn data-a=ca>Add</button></div>`;
}
function sickCard() {
  const c = cfg();
  return `<div class=card><div class=rowb><h3>Sick-day mode</h3><button class="${c.sick ? 'btn' : 'lk'}" data-a=sk>${c.sick ? 'Turn off' : 'Turn on'}</button></div>${c.sick ? `<label class=f>Hold list: medications to ask your prescriber about pausing when sick</label><textarea rows=3 data-hold=1 placeholder="List them here">${esc(c.hold || '')}</textarea>` : '<p class=sm>Turn on when ill to keep a hold list for your prescriber.</p>'}</div>`;
}
function setCard() {
  let p = null;
  try {
    p = localStorage.getItem('pinh');
  } catch (e) {}
  return `<div class=card><h3>Settings</h3><div class=en>${['light', 'dark', ''].map((x) => `<button data-a=th data-v="${x}">${x || 'Auto'}</button>`).join('')}</div><label class=f>Screen lock PIN (this device, 4-8 digits)</label><input type=text inputmode=numeric id=pin placeholder="${p ? 'PIN is set' : 'New PIN'}"><div style="margin-top:8px"><button class=btn data-a=pn>Set PIN</button> ${p ? '<button class=lk data-a=pc>Remove PIN</button>' : ''}</div><p class=sm>A screen lock, not encryption.</p><label class=f>Text size</label><div class=en>${[
    ['Aa', 1],
    ['Aa+', 1.12],
    ['Aa++', 1.25],
  ]
    .map(([l, z]) => `<button data-a=tz data-v=${z}>${l}</button>`)
    .join(
      '',
    )}</div><label class=f>Effects</label><div class=en><button data-a=fx data-v=full>Full glass</button><button data-a=fx data-v=lite>Reduce effects</button></div><button class=btn data-a=ics style="margin-top:10px">Export reminders (.ics)</button> <button class=lk data-a=tour>Show tour again</button><p class=sm>Import the file into your phone calendar for a daily alert at each window.</p></div>`;
}
let trend = 'Systolic',
  mo = iso(new Date()).slice(0, 7);
const LAB = {
  AST: [10, 40],
  ALT: [7, 56],
  GGT: [8, 61],
  A1c: [4, 5.6],
  'Fasting glucose': [70, 99],
  ApoB: [40, 90],
  LDL: [40, 100],
  Hematocrit: [38, 50],
  PSA: [0, 4],
  'Cystatin C': [0.6, 1.0],
  Potassium: [3.5, 5.0],
  '25-OH D': [30, 100],
  B12: [200, 900],
  Ferritin: [30, 400],
  Creatinine: [0.7, 1.3],
  TSH: [0.4, 4.5],
  HDL: [40, 100],
  Triglycerides: [0, 150],
  Estradiol: [10, 40],
};
const planned = (l) => {
  const m = l.match(/[\d.,-]+ ?(mg|mcg|units|IU|g)/);
  return m ? 'Actual dose (planned ' + m[0] + ')' : 'Actual dose';
};
const drawTxt = () => {
  const c = cfg();
  if (!c.draw) return 'No draw scheduled. Pick a date and interval in weeks.';
  const n = days2(iso(new Date()), c.draw);
  return n >= 0
    ? `Next draw in ${n} days (${c.draw}). Hold supplements 72 hours before.`
    : `Draw was ${-n} days ago. Next due ${addD(c.draw, 7 * (c.dint || 12))}.`;
};
function chart(pts, o: any = {}) {
  if (pts.length < 2) return '<p class=sm>Log at least two entries to see a trend.</p>';
  const W = 340,
    H = 170,
    L = 34,
    B = 22,
    ys = pts.map((p) => p.y),
    lo0 = Math.min(...ys, o.band ? o.band[0] : 1e9),
    hi0 = Math.max(...ys, o.band ? o.band[1] : -1e9),
    pd = (hi0 - lo0) * 0.1 || 1,
    lo = lo0 - pd,
    hi = hi0 + pd,
    X = (i) => L + (i * (W - L - 8)) / (pts.length - 1),
    Y = (v) => H - B - ((v - lo) / (hi - lo)) * (H - B - 8),
    tk = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  return `<svg viewBox="0 0 ${W} ${H}" class=ch>${o.band ? `<rect x=${L} y=${Y(o.band[1])} width=${W - L - 8} height=${Y(o.band[0]) - Y(o.band[1])} class=bd />` : ''}${tk.map((t) => `<line x1=${L} x2=${W - 8} y1=${Y(t)} y2=${Y(t)} class=gl /><text x=${L - 4} y=${Y(t) + 4} class=ax text-anchor=end>${Math.round(t * 10) / 10}</text>`).join('')}${(
    o.marks || []
  )
    .map((m) => {
      const i = pts.findIndex((q) => q.x >= m.d);
      return i < 0
        ? ''
        : `<line x1=${X(i)} x2=${X(i)} y1=8 y2=${H - B} class=mk /><text x=${X(i) + 3} y=16 class=ax>${esc(m.t.slice(0, 14))}</text>`;
    })
    .join(
      '',
    )}<polygon class=ar points="${X(0)},${H - B} ${pts.map((p, i) => X(i) + ',' + Y(p.y)).join(' ')} ${X(pts.length - 1)},${H - B}"/><polyline class=ln2 points="${pts.map((p, i) => X(i) + ',' + Y(p.y)).join(' ')}"/>${pts.map((p, i) => `<circle cx=${X(i)} cy=${Y(p.y)} r=${o.sel === i ? 5.5 : 3} class="dt2 ${o.sel === i ? 'sel' : ''}" />`).join('')}${o.tap ? pts.map((p, i) => `<circle cx=${X(i)} cy=${Y(p.y)} r=${pts.length > 45 ? 6 : 11} class=hit data-tp=${i} />`).join('') : ''}<text x=${L} y=${H - 6} class=ax>${pts[0].x.slice(5)}</text><text x=${W - 8} y=${H - 6} class=ax text-anchor=end>${pts[pts.length - 1].x.slice(5)}</text></svg>`;
}
window.CH = chart;
const mean = (a) => {
  a = a.filter((x) => x !== '' && x != null && !isNaN(x));
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
};
const TR = {
  Systolic: { f: (d) => mean(['am', 'pm', 'ev'].map((x) => val(d, 'bp.' + x + '.0'))), band: [115, 122] },
  Diastolic: { f: (d) => mean(['am', 'pm', 'ev'].map((x) => val(d, 'bp.' + x + '.1'))), band: [65, 75] },
  Weight: { f: (d) => d.wt },
  Sleep: { f: (d) => d.sl },
  Waist: { f: (d) => d.wc },
  Neck: { f: (d) => val(d, 'ms.neck') },
  Chest: { f: (d) => val(d, 'ms.chest') },
  Arm: { f: (d) => val(d, 'ms.arm') },
  Thigh: { f: (d) => val(d, 'ms.thigh') },
  Wakes: { f: (d) => d.aw },
  Bedtime: { f: (d) => (d.bt ? (+d.bt.slice(0, 2) + +d.bt.slice(3, 5) / 60 - 18 + 24) % 24 : null) },
  'Resting HR': { f: (d) => d.hr },
  Adherence: {
    f: (d, s) => {
      const [a, b] = prog(s);
      return b ? Math.round((100 * a) / b) : null;
    },
  },
  Calories: { f: (d) => sumN(d, 'k') || null },
  Protein: { f: (d) => sumN(d, 'p') || null },
  Water: { f: (d) => d.w || null },
};
let trendRange = 30,
  trendSel: number | null = null;
function trendCard() {
  const from = addD(iso(new Date()), -trendRange),
    ks = Object.keys(mem)
      .filter((k) => k.startsWith('d-') && k.slice(2) >= from)
      .sort(),
    T = TR[trend],
    pts = ks
      .map((k) => ({ x: k.slice(2), y: T.f(mem[k], k.slice(2)) }))
      .filter((p) => p.y != null && p.y !== '' && !isNaN(p.y)),
    sel = trendSel != null && pts[trendSel] ? trendSel : null;
  return `<div class=card><h3>Trends</h3><div class=chips>${Object.keys(TR)
    .map((t) => `<button data-a=tr data-v="${t}" class="${t === trend ? 'on' : ''}">${t}</button>`)
    .join(
      '',
    )}</div><div class=chips style="margin-top:8px">${[7, 30, 90].map((n) => `<button data-a=tr2 data-v=${n} class="${n === trendRange ? 'on' : ''}">${n} days</button>`).join('')}</div>${chart(pts, { band: T.band, marks: allMarks(), tap: true, sel })}<p class=sm role=status>${sel != null ? fmt(pts[sel].x) + ': <b>' + Math.round(pts[sel].y * 10) / 10 + '</b>' : pts.length > 1 ? 'Tap a point to see that day.' : ''}</p>${chgDelta(pts)}${T.band ? '<p class=sm>Shaded band is your protocol target.</p>' : ''}</div>`;
}
// ---- Titration view: weight, BP and sleep before and after a dose change, plus labs either side ----
let tiSel = 0;
type TPt = { x: number; y: number };
function titrPanel(m: { n: string; pts: TPt[]; band?: number[]; d: number }, x0: number, x1: number) {
  if (m.pts.length < 2) return `<p class=sm>${m.n}: not enough data in this window.</p>`;
  const W = 340,
    H = 92,
    L = 34,
    R = 8,
    T = 18,
    B = 8,
    ys = m.pts.map((p) => p.y).concat(m.band || []);
  let lo = Math.min(...ys),
    hi = Math.max(...ys);
  const pd = (hi - lo) * 0.15 || 1;
  lo -= pd;
  hi += pd;
  const X = (d: number) => L + ((d - x0) / (x1 - x0)) * (W - L - R),
    Y = (v: number) => H - B - ((v - lo) / (hi - lo)) * (H - B - T),
    avg = (a: TPt[]) => (a.length ? a.reduce((t, p) => t + p.y, 0) / a.length : null),
    bef = avg(m.pts.filter((p) => p.x < 0)),
    aft = avg(
      m.pts.filter((p) => p.x >= 7).length >= 3
        ? m.pts.filter((p) => p.x >= 7)
        : m.pts.filter((p) => p.x >= 0),
    ),
    last = Math.max(...m.pts.map((p) => p.x)),
    r = (v: number) => Math.round(v * 10) / 10;
  return `<svg viewBox="0 0 ${W} ${H}" class=ch role=img aria-label="${esc(m.n)} before and after">${m.band ? `<rect x=${L} y=${Y(m.band[1])} width=${W - L - R} height=${Math.max(1, Y(m.band[0]) - Y(m.band[1]))} class=bd />` : ''}<text x=${L} y=11 class=ax>${esc(m.n)}</text>${[lo + pd, hi - pd].map((t) => `<line x1=${L} x2=${W - R} y1=${Y(t)} y2=${Y(t)} class=gl /><text x=${L - 4} y=${Y(t) + 4} class=ax text-anchor=end>${r(t)}</text>`).join('')}<line x1=${X(0)} x2=${X(0)} y1=${T - 4} y2=${H - B} class=mk />${bef != null ? `<line x1=${X(x0)} x2=${X(0)} y1=${Y(bef)} y2=${Y(bef)} class=av />` : ''}${aft != null ? `<line x1=${X(Math.min(0, last))} x2=${X(last)} y1=${Y(aft)} y2=${Y(aft)} class=av />` : ''}<polyline class=ln2 points="${m.pts.map((p) => X(p.x) + ',' + Y(p.y)).join(' ')}"/>${m.pts.map((p) => `<circle cx=${X(p.x)} cy=${Y(p.y)} r=2.5 class=dt2 />`).join('')}</svg>`;
}
function titrCard() {
  const today = iso(new Date()),
    ev = allMarks()
      .filter((e) => e.d <= today)
      .sort((a, b) => (a.d < b.d ? 1 : -1));
  if (!ev.length)
    return '<div class=card><h3>Before and after a change</h3><p class=sm>Log a dose change (More, Health and labs) to see weight, BP and sleep before and after it.</p></div>';
  const e = ev[Math.min(tiSel, ev.length - 1)],
    x0 = -28,
    x1 = Math.max(7, Math.min(56, days2(e.d, today))),
    num = (v) => v !== '' && v != null && !isNaN(v),
    ser = (f: (D: any) => any): TPt[] => {
      const o: TPt[] = [];
      for (let k = x0; k <= x1; k++) {
        const D = mem['d-' + addD(e.d, k)],
          v = D ? f(D) : null;
        if (num(v)) o.push({ x: k, y: +v });
      }
      return o;
    },
    M = [
      { n: 'Weight (lb)', pts: ser((D) => D.wt), d: 1 },
      {
        n: 'Systolic BP',
        pts: ser((D) =>
          avgOf(['am', 'pm', 'ev'].map((q) => val(D, 'bp.' + q + '.0')).filter(num) as number[]),
        ),
        band: [115, 122],
        d: 0,
      },
      { n: 'Sleep (h)', pts: ser((D) => D.sl), d: 1 },
    ],
    av = (a: TPt[]) => (a.length >= 3 ? a.reduce((t, p) => t + p.y, 0) / a.length : null),
    rows = M.map((m) => {
      const b = av(m.pts.filter((p) => p.x < 0)),
        a0 = m.pts.filter((p) => p.x >= 7),
        a = av(a0.length >= 3 ? a0 : m.pts.filter((p) => p.x >= 0));
      return `<tr><td>${esc(m.n)}</td><td>${b == null ? '-' : b.toFixed(m.d)}</td><td>${a == null ? '-' : a.toFixed(m.d)}</td><td>${b == null || a == null ? '-' : (a - b > 0 ? '+' : '') + (a - b).toFixed(m.d)}</td></tr>`;
    }),
    g: Record<string, any[]> = {};
  ((mem.labs || {}).r || []).forEach((x) => (g[x.m] = g[x.m] || []).push(x));
  const labs = Object.entries(g)
    .map(([m, arr]) => {
      const s = arr.slice().sort((x, y) => (x.d < y.d ? -1 : 1)),
        b = s.filter((x) => x.d <= e.d && days2(x.d, e.d) <= 120).pop(),
        a = s.find((x) => x.d > e.d && days2(e.d, x.d) <= 180);
      if (!b || !a) return '';
      const rg = LAB[m],
        fl = rg && (a.v < rg[0] || a.v > rg[1]);
      return `<tr><td>${esc(m)}</td><td>${b.v}</td><td${fl ? ' style="color:var(--nw);font-weight:600"' : ''}>${a.v}</td><td>${a.v - b.v > 0 ? '+' : ''}${+(a.v - b.v).toFixed(2)}</td></tr>`;
    })
    .join('');
  return `<div class=card><h3>Before and after a change</h3><div class=chips>${ev
    .slice(0, 6)
    .map(
      (x, i) =>
        `<button data-a=ti data-v=${i} class="${x === e ? 'on' : ''}">${esc(x.t.slice(0, 34))} ${x.d.slice(5)}</button>`,
    )
    .join(
      '',
    )}</div><p class=sm>The dashed line is ${dayLbl(e.d)}.${days2(e.d, today) < 21 ? ` Only ${days2(e.d, today)} days have passed, so the after numbers are early.` : ''} Flat dashed lines are your average before and after (after starts a week in, so the dose has time to settle).</p>${M.map((m) => titrPanel(m, x0, x1)).join('')}<table><tr><th>Average</th><th>Before</th><th>After</th><th>Change</th></tr>${rows.join('')}</table>${labs ? `<h4 class=sub>Labs either side</h4><table><tr><th>Marker</th><th>Before</th><th>After</th><th>Change</th></tr>${labs}</table>` : '<p class=sm>No lab draws on both sides of this change yet.</p>'}<p class=sm>Correlation, not proof. Lifting, sleep and food also move these numbers.</p></div>`;
}
function calCard() {
  const [y, m] = mo.split('-').map(Number),
    f = new Date(y, m - 1, 1),
    n = new Date(y, m, 0).getDate(),
    cells = [];
  for (let i = 0; i < f.getDay(); i++) cells.push('<i></i>');
  for (let d = 1; d <= n; d++) {
    const s = `${mo}-${String(d).padStart(2, '0')}`,
      D = mem['d-' + s],
      [a, b] = D ? prog(s) : [0, 0],
      pc = b ? a / b : 0,
      lf = window.L_ && L_.has(s);
    cells.push(
      `<button data-a=cd data-v=${s} class="cal ${s === date ? 'sel' : ''}" style="--p:${Math.round(pc * 100)}%">${d}${lf ? '<b></b>' : ''}${D && D.dn ? '<u>&#10003;</u>' : ''}</button>`,
    );
  }
  return `<div class=card><h3>${f.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3><div class=cm><button data-a=mp>&#8249;</button><button data-a=mn>&#8250;</button></div><div class=cg>${'SMTWTFS'
    .split('')
    .map((x) => `<span>${x}</span>`)
    .join(
      '',
    )}${cells.join('')}</div><p class=sm>Shading is adherence, a dot is a lift day, a check is a completed day.</p></div>`;
}
const MEALS = [
  ['Meal 1 shake (lift)', 775, 94, 89, 6, 'L'],
  ['Meal 1 shake (rest)', 425, 86, 11, 3, 'R'],
  ['Meal 2 shake (lift)', 645, 85, 34, 21, 'L'],
  ['Meal 2 whey (rest)', 285, 67, 2, 1, 'R'],
  ['Dinner (lift)', 820, 87, 80, 9, 'L'],
  ['Dinner (rest)', 630, 77, 50, 9, 'R'],
  ['Bedtime peanut butter', 95, 4, 3, 8, 'A'],
];
const sumN = (d, k) => ((d && d.nu) || []).reduce((t, x) => t + (+x[k] || 0), 0);
function fuelV() {
  const d = mem['d-' + date] || {},
    nu = d.nu || [],
    t = typeOf(date),
    nt = cfg().nt || {},
    now = new Date(),
    last = nu.filter((x) => x.t).slice(-1)[0],
    fh =
      last && date === iso(now)
        ? (now.getHours() * 60 + now.getMinutes() - (+last.t.slice(0, 2) * 60 + +last.t.slice(3, 5))) / 60
        : null,
    bar = (l, v, g, u) =>
      `<div class=mvr style="grid-template-columns:70px 1fr 100px"><span>${l}</span><div class=mvb><i style="width:${g ? Math.min(100, (v / g) * 100) : 0}%;background:var(--ac)"></i></div><b style="text-align:right">${Math.round(v)}${g ? '/' + g : ''} ${u}</b></div>`;
  return `${vbar('fuel', 'Say or type: eggs 520 calories')}<div class=card><h3>Today's fuel</h3>${bar('Calories', sumN(d, 'k'), nt.k, 'kcal')}${bar('Protein', sumN(d, 'p'), nt.p, 'g')}<p class=sm>Carbs ${Math.round(sumN(d, 'c'))} g, fat ${Math.round(sumN(d, 'f'))} g${fh != null && fh >= 0 ? `. Last meal ${last.t}, fasted ${fh.toFixed(1)} h.` : ''}</p><div class=g style="grid-template-columns:1fr 1fr"><input type=number inputmode=numeric data-nt=k placeholder="Kcal goal" value="${nt.k || ''}"><input type=number inputmode=numeric data-nt=p placeholder="Protein goal" value="${nt.p || ''}"></div></div>
<div class=card><h3>Quick add</h3><p class=sm>Estimates from your protocol's meal plan. Use a custom entry for exact numbers.</p>${recents()
    .map((x, i) =>
      i < 6 ? `<button class=lk data-a=nrc data-v=${i} style="margin:0 6px 6px 0">${esc(x.n)}</button>` : '',
    )
    .join(
      '',
    )}<div><button class=lk data-a=cy2>Copy yesterday's meals</button></div><div class=chips>${MEALS.map((m, i) => (m[5] === 'A' || m[5] === t ? `<button data-a=nm data-v=${i}>${m[0]}</button>` : '')).join('')}</div><input type=text id=nn placeholder="Custom meal" style="margin-top:10px"><div class=g style="grid-template-columns:1fr 1fr 1fr 1fr"><input type=number id=nk placeholder="kcal"><input type=number id=np placeholder="P g"><input type=number id=nc placeholder="C g"><input type=number id=nf placeholder="F g"></div><button class=btn data-a=nc2>Add entry</button> <button class=lk data-a=nfv>Save as favorite</button></div>
${favCard()}<div class=card><h3>Logged</h3>${nu.map((x, i) => `<div class=r><span>${x.t || ''} ${esc(x.n)}<br><small class=sm>${x.k} kcal, P ${x.p}, C ${x.c}, F ${x.f}</small></span><button data-a=nx2 data-v=${i}>Remove</button></div>`).join('') || '<p class=sm>Nothing logged yet.</p>'}</div>
<div class=card><h3>Water</h3><p class=sm>${d.w || 0} oz today</p><div class=chips>${[8, 16, 24].map((n) => `<button data-a=wt data-v=${n}>+${n} oz</button>`).join('')}<button data-a=wt data-v=-8>-8 oz</button></div></div>${groceryCard()}`;
}
function nextTxt() {
  const [a, b] = prog(date);
  if (date !== iso(new Date())) return (b ? Math.round((100 * a) / b) : 0) + '% of the day';
  const n = new Date(),
    m = n.getHours() * 60 + n.getMinutes(),
    f = Wn.map((w, i) => {
      const [x, y] = w[0].split(':');
      return [+x * 60 + +y, i];
    }).find((x) => x[0] > m);
  if (!f) return 'All windows done for today';
  const dm = f[0] - m;
  return `Next: ${Wn[f[1]][0]} ${Wn[f[1]][1]}, in ${dm >= 60 ? Math.floor(dm / 60) + 'h ' : ''}${dm % 60}m`;
}
let labSel = null;
const AM = {
  sys: 'Systolic',
  dia: 'Diastolic',
  sl: 'Sleep (h)',
  hr: 'Resting HR',
  wt: 'Weight',
  wc: 'Waist',
};
const rvals = (d, k) =>
  (k === 'sys' || k === 'dia'
    ? ['am', 'pm', 'ev'].map((q) => val(d, 'bp.' + q + '.' + (k === 'sys' ? 0 : 1)))
    : [d[k]]
  ).filter((x) => x !== '' && x != null && !isNaN(x));
function alertHTML() {
  const d = mem['d-' + date] || {};
  let h = (cfg().al || [])
    .filter((r) => rvals(d, r.m).some((x) => (r.o === '<' ? x < r.v : x > r.v)))
    .map((r) => `<div class=al>${esc(r.t)}</div>`)
    .join('');
  const ks = Object.keys(mem).filter((k) => k.startsWith('d-'));
  if (ks.length >= 5) {
    const lb = cfg().lastBk,
      cl = window.Cloud && window.Cloud.st.at,
      lastB = Math.max(lb ? +new Date(lb + 'T12:00:00') : 0, cl || 0),
      dAgo = lastB ? Math.floor((Date.now() - lastB) / 864e5) : null;
    if ((!window.Cloud || window.Cloud.st.checked) && (dAgo == null || dAgo >= 3))
      h += `<div class=al>${dAgo == null ? 'No backup yet' : 'No backup in ' + dAgo + ' days'}. Your data lives only on this device. <button class=lk data-a=gbk>Back up</button></div>`;
  }
  if (window.Cloud && window.Cloud.st.at && ks.length >= 5) {
    const lv = cfg().lastVerify,
      da = lv ? days2(lv, iso(new Date())) : null;
    if (da == null || da >= 30)
      h += `<div class=al>${da == null ? 'Your cloud backup has never been checked' : 'Cloud backup last checked ' + da + ' days ago'}. <button class=lk data-a=cvf>Verify now</button></div>`;
  }
  if (mode === 'unsaved')
    h =
      `<div class=al role=alert>Saving to this device failed. Reload and try again, and back up as soon as you can. <button class=lk data-a=gbk>Open backup</button></div>` +
      h;
  if (window.Cloud && /failed/i.test(window.Cloud.st.msg || ''))
    h += `<div class=al>${esc(window.Cloud.st.msg)} <button class=lk data-a=gbk>Open backup</button></div>`;
  h += vialAlerts() + procAlerts();
  return h;
}
function alertCard() {
  const R = cfg().al || [];
  return `<div class=card><h3>Alert rules</h3><p class=sm>Show a message when a logged value crosses a threshold you set with your prescriber.</p>${R.map((r, i) => `<div class=r><span>${AM[r.m]} ${r.o} ${r.v}: ${esc(r.t)}</span><button data-a=arx data-v=${i}>Remove</button></div>`).join('')}<div class=g style="grid-template-columns:2fr 1fr 1fr"><select id=am>${Object.entries(
    AM,
  )
    .map(([k, v]) => `<option value=${k}>${v}</option>`)
    .join(
      '',
    )}</select><select id=ao><option>&lt;</option><option>&gt;</option></select><input type=number id=av placeholder="Value"></div><input type=text id=at placeholder="Message to show" style="margin-bottom:8px"><button class=btn data-a=ar>Add rule</button></div>`;
}
function supRate(id) {
  const ks = Object.keys(mem)
    .filter((k) => k.startsWith('d-'))
    .sort()
    .slice(-14);
  return ks.length ? ks.filter((k) => (mem[k].c || {})[id]).length / ks.length : 0;
}
function supAdj(id, on) {
  const S = mem.sup;
  if (!S) return;
  const C = JSON.parse(JSON.stringify(S));
  let ch = false;
  C.r.forEach((x) => {
    if (x.k === id && x.q) {
      x.c = Math.max(0, +(x.c + (on ? -x.q : x.q)).toFixed(2));
      ch = true;
    }
  });
  if (ch) put('sup', C);
}
function suppCard2() {
  const R = (mem.sup || {}).r || [];
  return `<div class=card><h3>Supplies</h3>${
    R.map((x, i) => {
      const r = x.k ? supRate(x.k) * (x.q || 0) : 0,
        dl = r > 0 ? Math.floor(x.c / r) : null;
      return `<div class=r><span>${esc(x.n)}${x.k ? ' <small class=sm>auto: ' + x.q + ' per check</small>' : ''}${dl != null ? ' <small class=sm>about ' + dl + ' days left</small>' : ''}${x.c <= 2 || (dl != null && dl <= 7) ? ' <small style="color:var(--nw)">low</small>' : ''}</span><button data-a=sm data-v="${i}|-1">-</button><b>${x.c}</b><button data-a=sm data-v="${i}|1">+</button><button data-a=sx data-v=${i}>Remove</button></div>`;
    }).join('') ||
    '<p class=sm>Track stock. Link an item to use stock up automatically when you check it off.</p>'
  }<div class=g style="grid-template-columns:2fr 1fr"><input type=text id=sn placeholder="Item"><input type=number id=sc placeholder="Count"></div><select id=sk><option value="">Not linked</option>${all()
    .map((x) => `<option value=${x.id}>${esc(x.l.slice(0, 40))}</option>`)
    .join(
      '',
    )}</select><input type=number id=sq placeholder="Used per check" aria-label="Amount used per check, for example 0.1 mL or 1 capsule" step=any style="margin:8px 0"><button class=btn data-a=sa2>Add item</button></div>`;
}
function chgDelta(pts) {
  const R = allMarks();
  const o = R.map((c) => {
    const b = pts.filter((p) => p.x < c.d && days2(p.x, c.d) <= 28).map((p) => p.y),
      a = pts.filter((p) => p.x >= c.d && days2(c.d, p.x) <= 28).map((p) => p.y);
    if (b.length < 2 || a.length < 2) return '';
    const m = (x) => x.reduce((s, y) => s + y, 0) / x.length;
    return `<div class=sm>${esc(c.t)} (${c.d.slice(5)}): ${m(b).toFixed(1)} to ${m(a).toFixed(1)}</div>`;
  }).join('');
  return o ? `<div style="margin-top:8px"><b class=sm>What changed</b>${o}</div>` : '';
}
function favCard() {
  const F = (mem.fav || {}).r || [];
  return F.length
    ? `<div class=card><h3>Favorites</h3><div class=chips>${F.map((x, i) => `<span style="display:inline-flex;gap:2px"><button data-a=nfa data-v=${i}>${esc(x.n)}</button><button data-a=nfx data-v=${i} aria-label="Remove favorite">&times;</button></span>`).join('')}</div></div>`
    : '';
}
function groceryCard() {
  const L = cfg().gd || 5,
    R = 7 - L,
    u = (a, b) => L * a + R * b,
    f = (n) => Math.round(n * 10) / 10,
    it = [
      ['Whey isolate', f(u(150, 150) / 1000) + ' kg'],
      ['Oats, dry', f(u(80, 0) / 1000) + ' kg'],
      ['Peanut butter', f(u(32, 16) / 1000) + ' kg'],
      ['Hemp hearts', f(u(20, 0) / 1000) + ' kg'],
      ['PBFit', f(u(32, 32) / 1000) + ' kg'],
      ['Chicken, cooked', f((u(8.5, 8) * 28.35) / 1000) + ' kg'],
      ['Jasmine rice, cooked', f(u(1.25, 0.75)) + ' cups'],
      ['Black beans', f(u(0.5, 0.25)) + ' cups'],
      ['Fruit', u(1, 0) + ' pieces'],
      ['Greens powder', u(1, 1) + ' servings'],
    ];
  return `<div class=card><h3>Weekly grocery estimate</h3><label class=f>Lift days per week</label><select data-gd>${[3, 4, 5, 6, 7].map((n) => `<option ${L === n ? 'selected' : ''}>${n}</option>`).join('')}</select><table>${it.map((x) => `<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table><p class=sm>Estimated from your protocol's meal plan. Raw weights run higher for chicken and rice.</p></div>`;
}
let nudge = null,
  tcode = '',
  phs = [],
  phLoad = false,
  phSel = [];
const RS = ['Travel', 'Forgot', 'Side effects', 'Out of supply', 'Felt unwell', 'Other'];
const enc = async (o) => {
  const s = new Blob([JSON.stringify(o)]).stream().pipeThrough(new CompressionStream('gzip')),
    b = new Uint8Array(await new Response(s).arrayBuffer());
  let t = '';
  b.forEach((x) => (t += String.fromCharCode(x)));
  return 'DLY1:' + btoa(t);
};
const dec = async (c) => {
  const b = Uint8Array.from(atob(c.slice(5)), (x) => x.charCodeAt(0)),
    s = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(s).text());
};
function nudgeHTML(d) {
  if (date !== iso(new Date())) return '';
  const n = new Date(),
    m = n.getHours() * 60 + n.getMinutes(),
    c = d.c || {},
    ws = d.ws || {},
    it = items(date, false),
    open = Wn.map((w, i) => {
      const [a, b] = w[0].split(':'),
        xs = it.filter((x) => x.w === i);
      return { i, t: +a * 60 + +b, left: xs.filter((x) => !c[x.id]).length, n: xs.length };
    })
      .filter((o) => o.n && o.left && !ws[o.i] && o.t + 45 < m)
      .slice(-2);
  if (!open.length && !nudge) return '';
  return `<div class=card><h3>Catch up</h3>${open.map((o) => `<div class=sm style="color:var(--tx)">${Wn[o.i][0]} ${Wn[o.i][1]}: ${o.left} open</div><div class=chips style="margin-bottom:8px"><button data-a=nt data-v="${o.i}|taken">Taken</button><button data-a=nt data-v="${o.i}|skipped">Skipped</button><button data-a=nt data-v="${o.i}|missed">Missed</button></div>`).join('')}${nudge ? `<div class=sm>Why was ${Wn[nudge.w][1]} ${nudge.s}?</div><div class=chips>${RS.map((r) => `<button data-a=nr data-v="${r}">${r}</button>`).join('')}</div>` : ''}</div>`;
}
const ICM =
    '<svg viewBox="0 0 24 24"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11.5a6 6 0 0 0 12 0M12 17.5V21"/></svg>',
  ICS = '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  ICK = '<svg viewBox="0 0 24 24"><path d="M4 8h16M4 12h16M4 16h10"/></svg>';
function quickRow() {
  return date !== iso(new Date())
    ? ''
    : `${vbar('today', 'Say: took morning meds, done')}<div class=chips style="margin:6px 0 10px"><button data-a=qw>+8 oz water</button><button data-a=qg data-v=fuel>Add meal</button><button data-a=qg data-v=vitals>Log vitals</button></div>`;
}
function recents() {
  const seen = {},
    r = [];
  Object.keys(mem)
    .filter((k) => k.startsWith('d-'))
    .sort()
    .reverse()
    .slice(0, 14)
    .forEach((k) =>
      (mem[k].nu || []).forEach((x) => {
        if (!seen[x.n] && !MEALS.some((m) => m[0] === x.n)) {
          seen[x.n] = 1;
          r.push(x);
        }
      }),
    );
  return r;
}
function addPhoto(f) {
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, 900 / Math.max(im.width, im.height)),
        c = document.createElement('canvas');
      c.width = Math.max(1, im.width * s);
      c.height = Math.max(1, im.height * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const id = date + '-' + Date.now(),
        x = { id, d: date, p: $('#pp').value, u: c.toDataURL('image/jpeg', 0.78) };
      IDB.phSet(id, x).then(() => {
        phs.unshift(x);
        render();
      });
    };
    im.src = r.result as string;
  };
  r.readAsDataURL(f);
}
function bodyCard(d) {
  if (!phLoad) {
    phLoad = true;
    IDB.phAll()
      .then((r) => {
        phs = r.sort((a, b) => (b.id < a.id ? -1 : 1));
        render();
      })
      .catch(() => {});
  }
  const sel = phSel.map((i) => phs[i]).filter(Boolean);
  return `<div class=card><h3>Measurements</h3><div class=g style="grid-template-columns:1fr 1fr"><div><label class=f>Neck (in)</label>${inp(d, 'ms.neck', 'in')}</div><div><label class=f>Chest (in)</label>${inp(d, 'ms.chest', 'in')}</div><div><label class=f>Arm (in)</label>${inp(d, 'ms.arm', 'in')}</div><div><label class=f>Thigh (in)</label>${inp(d, 'ms.thigh', 'in')}</div></div><p class=sm>Waist is under Body and energy. Charts are in History.</p></div>
<div class=card><h3>Progress photos</h3><div class=g style="grid-template-columns:1fr 1fr"><select id=pp>${['Front', 'Side', 'Back'].map((x) => `<option>${x}</option>`).join('')}</select><label class=btn style="text-align:center">Add photo<input type=file accept="image/*" id=pf hidden></label></div>${sel.length ? `<div class=cmp>${sel.map((x) => `<figure><img src="${x.u}" alt="Progress photo ${x.p} ${x.d}"><figcaption>${x.d.slice(5)} ${x.p}</figcaption></figure>`).join('')}</div>` : ''}<div class=thumbs>${phs
    .slice(0, 24)
    .map(
      (x, i) =>
        `<button data-a=pv data-v=${i} class="${phSel.includes(i) ? 'on' : ''}" aria-label="Photo ${x.p} ${x.d}"><img src="${x.u}" alt=""></button>`,
    )
    .join(
      '',
    )}</div><p class=sm>${phs.length ? 'Tap two photos to compare.' : 'Photos stay on this device and are not in backups.'}</p>${phSel.length ? '<button class=lk data-a=pd>Delete selected</button>' : ''}</div>`;
}
const SPEECH = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceMsg = '',
  listening = false,
  recog = null,
  vsc = null,
  vacts = [],
  vmsg = '';
const actF = (x) => (cfg().act || {})[x.id] || x.f;
const DOCLOG = [
  [
    'v2',
    'Sample',
    [
      'Weekly weigh-in moved to Monday mornings, before breakfast.',
      'Rest days: lighter Meal 1 and Meal 2; most carbs at dinner.',
      'Afternoon walk added on weekdays.',
    ],
  ],
  [
    'v1',
    'Sample',
    ['Sample regimen: rename, hide or add items under Customize and settings.', 'Version notes are where you record what changed and why.'],
  ],
];
function vialAdj(id, on) {
  const V = mem.vials;
  if (!V) return;
  const C = JSON.parse(JSON.stringify(V)),
    r = C.r.filter((v) => v.k === id).sort((a, b) => (a.rd < b.rd ? -1 : 1));
  let ch = false;
  if (on) {
    const v = r.find((x) => x.c > 0);
    if (v) {
      v.c--;
      ch = true;
    }
  } else {
    const v = r
      .slice()
      .reverse()
      .find((x) => x.c < x.t);
    if (v) {
      v.c++;
      ch = true;
    }
  }
  if (!ch) return;
  put('vials', C);
  const it = all().find((x) => /Sample peptide 300 mcg SubQ \(weekdays\)/.test(x.l));
  if (it && id === it.id) {
    const mine = C.r.filter((v) => v.k === it.id);
    if (mine.length && mine.every((v) => v.c <= 0) && !cfg().p2) {
      const c = JSON.parse(JSON.stringify(cfg()));
      c.hide = c.hide || {};
      c.hide[it.id] = 1;
      c.p2 = iso(new Date());
      put('cfg', c);
    }
  }
}
function vialCard() {
  const V = (mem.vials || {}).r || [],
    t = iso(new Date());
  return `<div class=card><h3>Peptide vials</h3>${
    V.map((v, i) => {
      const dl = v.rd ? v.sd - days2(v.rd, t) : null;
      return `<div class=r><span>${esc(v.n)}: ${v.c} of ${v.t} doses<br><small class=sm>${v.rd ? 'opened ' + v.rd.slice(5) + ', discard ' + addD(v.rd, v.sd).slice(5) + (dl <= 7 ? ' (' + (dl < 0 ? 'expired' : dl + ' days left') + ')' : '') : 'not opened'}${v.k ? ', linked' : ''}</small></span><button data-a=vm data-v="${i}|-1">-</button><button data-a=vm data-v="${i}|1">+</button><button data-a=vx data-v=${i}>Remove</button></div>`;
    }).join('') ||
    '<p class=sm>Add each reconstituted vial. Linked doses count down when you check the item, oldest vial first. When the last linked sample peptide vial empties, Window 7A retires.</p>'
  }<input type=text id=vn placeholder="Name, for example Sample peptide vial 1"><div class=g style="grid-template-columns:.8fr 1.6fr .8fr"><input type=number id=vt placeholder="Doses"><input type=date id=vd value="${t}"><input type=number id=vs value=28></div><p class=sm>Total doses, date opened, days until discard</p><select id=vk><option value="">Not linked</option>${all()
    .filter(isInj)
    .map((x) => `<option value=${x.id}>${esc(x.l.slice(0, 44))}</option>`)
    .join(
      '',
    )}</select><button class=btn data-a=va style="margin-top:8px">Add vial</button>${cfg().p2 ? `<p class=sm>Window 7A retired ${cfg().p2}. You are on the 2-pulse standard.</p>` : ''}</div>`;
}
function vialAlerts() {
  const t = iso(new Date());
  let h = '';
  ((mem.vials || {}).r || []).forEach((v) => {
    if (v.rd && v.c > 0) {
      const dl = v.sd - days2(v.rd, t);
      if (dl <= 3)
        h += `<div class=al>${esc(v.n)}: ${dl < 0 ? 'past its discard date' : 'discard in ' + dl + ' days'} with ${v.c} doses left.</div>`;
    }
  });
  const c = cfg();
  if (c.p2 && days2(c.p2, t) <= 14)
    h += `<div class=al>Window 7A retired on ${c.p2}. You are now on the 2-pulse standard.</div>`;
  return h;
}
function arrCard() {
  const t = iso(new Date()),
    A = all().filter((x) => actF(x) && actF(x) > t);
  return `<div class=card><h3>Arrivals</h3>${A.map((x) => `<div class=r><span>${esc(x.l.slice(0, 48))}<br><small class=sm>starts ${actF(x)} (${days2(t, actF(x))} days)</small></span><button data-a=arl data-v=${x.id}>Landed</button></div>`).join('') || '<p class=sm>Nothing pending. Set an arrival date and the item stays off your checklist until it lands.</p>'}<select id=ai>${all()
    .map((x) => `<option value=${x.id}>${esc(x.l.slice(0, 44))}</option>`)
    .join(
      '',
    )}</select><input type=date id=ad aria-label="Arrival date" style="margin:8px 0"><button class=btn data-a=ara>Hold until arrival</button></div>`;
}
function verCard() {
  const U = (mem.vlog || {}).r || [];
  return `<div class=card><h3>Protocol versions</h3><p class=sm>App is aligned with v15.4. When you update the doc, tell Claude and it will compare and update the app.</p>${U.slice()
    .reverse()
    .map((x) => `<div class=sm style="color:var(--tx)"><b>${esc(x.v)}</b> ${x.d}: ${esc(x.t)}</div>`)
    .join(
      '',
    )}${DOCLOG.map((v) => `<details><summary>${v[0]} (${v[1]})</summary><ul style="margin:6px 0 10px;padding-left:18px;font-size:14px">${(v[2] as string[]).map((t) => `<li>${t}</li>`).join('')}</ul></details>`).join('')}<div class=g style="grid-template-columns:1fr 2fr"><input type=text id=lv2 placeholder="Version"><input type=text id=lt placeholder="Your note"></div><button class=btn data-a=vla>Add note</button></div>`;
}
function sleepCard(d) {
  const tin = (k, l) =>
    `<div><label class=f>${l}</label><input type=time data-k=${k} value="${d[k] || ''}"></div>`;
  return `<div class=card><h3>Overnight sleep</h3><div class=g style="grid-template-columns:1fr 1fr">${tin('bt', 'Bedtime')}${tin('wk', 'Final wake')}</div><div class=g style="grid-template-columns:1fr 1fr 1fr"><div><label class=f>Sleep (h)</label>${inp(d, 'sl', 'h')}</div><div><label class=f>2-3 AM wakes</label>${inp(d, 'aw', '#')}</div><div><label class=f>Min awake</label>${inp(d, 'sa', 'min')}</div></div><p class=sm>${d.bt && d.wk ? 'Sleep fills in from bedtime and wake time. You can still edit it.' : 'Enter bedtime and wake time to fill Sleep, or type the hours.'}</p></div>`;
}
function runCmd(s) {
  s = (s || '')
    .toLowerCase()
    .replace(/\bover\b/g, '/')
    .replace(/,/g, '');
  const d = JSON.parse(JSON.stringify(mem['d-' + date] || {})),
    msg = [],
    hr = new Date().getHours();
  let m;
  if ((m = s.match(/(?:\bbp\b|blood pressure)\s*(\d{2,3})\s*[\/-]\s*(\d{2,3})/))) {
    const k = hr < 12 ? 'am' : hr < 17 ? 'pm' : 'ev';
    d.bp = d.bp || {};
    d.bp[k] = [+m[1], +m[2]];
    msg.push('BP ' + m[1] + '/' + m[2]);
  }
  if ((m = s.match(/\bweigh(?:t| in)?\s*(\d{2,3}(?:\.\d)?)/))) {
    d.wt = +m[1];
    msg.push('Weight ' + m[1]);
  }
  if ((m = s.match(/\b(?:slept|sleep)\s*(?:for\s*)?(\d(?:\.\d)?)/))) {
    d.sl = +m[1];
    msg.push('Sleep ' + m[1] + ' h');
  }
  if ((m = s.match(/\b(?:resting hr|heart rate|hr)\b\s*(\d{2,3})/))) {
    d.hr = +m[1];
    msg.push('HR ' + m[1]);
  }
  if ((m = s.match(/(\d{1,3})\s*(?:oz|ounces?)\s*(?:of\s*)?water/) || s.match(/\bwater\s*(\d{1,3})/))) {
    d.w = (d.w || 0) + +m[1];
    msg.push(m[1] + ' oz water');
  }
  if (
    (m = s.match(
      /\b(?:ate|meal|log)\b\s*(.*?)\s*(\d{2,4})\s*(?:calories|cals?|kcal)(?:.*?(\d{1,3})\s*(?:g|grams?)?\s*protein)?/,
    ))
  ) {
    d.nu = (d.nu || []).concat({
      n: (m[1] || '').trim() || 'Meal',
      k: +m[2],
      p: +(m[3] || 0),
      c: 0,
      f: 0,
      t: new Date().toTimeString().slice(0, 5),
    });
    msg.push('Meal ' + m[2] + ' kcal');
  }
  if ((m = s.match(/\b(?:took|taken)\s+(?:my\s+)?([a-z0-9-]+)/))) {
    const q = m[1];
    const it = items(date, false).find((x) => x.l.toLowerCase().includes(q) && !(d.c || {})[x.id]);
    if (it) {
      d.c = d.c || {};
      d.c[it.id] = 1;
      supAdj(it.id, true);
      vialAdj(it.id, true);
      msg.push('Checked ' + it.l.slice(0, 30));
    }
  }
  if ((m = s.match(/\bnote\s+(.+)/))) {
    d.nt = ((d.nt || '') + ' ' + m[1]).trim();
    msg.push('Note added');
  }
  if (msg.length) {
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  }
  voiceMsg = msg.length
    ? 'Logged: ' + msg.join(', ')
    : 'Did not catch that. Try "BP 118 over 72" or "took morning meds".';
}
const LX: [string, RegExp][] = [
  ['AST', /\b(?:ast|sgot|aspartate)\b/i],
  ['ALT', /\b(?:alt|sgpt|alanine)\b/i],
  ['GGT', /\b(?:ggt|gamma[- ]glutamyl)\b/i],
  ['A1c', /\b(?:hemoglobin a1c|hba1c|a1c)\b/i],
  ['Fasting glucose', /\bglucose\b/i],
  ['ApoB', /\bapo\s?b\b|apolipoprotein b/i],
  ['LDL', /\bldl\b/i],
  ['HDL', /\bhdl\b/i],
  ['Triglycerides', /\btriglycerides?\b/i],
  ['Hematocrit', /\b(?:hematocrit|hct)\b/i],
  ['PSA', /\bpsa\b/i],
  ['IGF-1', /\bigf-?\s?1\b|somatomedin/i],
  ['Cystatin C', /\bcystatin\b/i],
  ['Creatinine', /\bcreatinine\b/i],
  ['Potassium', /\bpotassium\b/i],
  ['25-OH D', /\b25-?\s?(?:oh|hydroxy)|vitamin d\b/i],
  ['B12', /\bb-?12\b|cobalamin/i],
  ['Ferritin', /\bferritin\b/i],
  ['TSH', /\btsh\b/i],
  ['Magnesium', /\bmagnesium\b/i],
  ['Estradiol', /\bestradiol\b/i],
];
let labPrev = null,
  labPd = '';
const EM = ['Sleep', 'Wakes', 'Systolic', 'Weight', 'Resting HR'],
  HOLDRE = /fish oil|curcumin|garlic|grape seed|green tea|\bnac\b/i;
function parseLabs(t) {
  const out = [],
    dm = t.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  let dt = iso(new Date());
  if (dm) {
    if (dm[1]) dt = dm[1];
    else {
      let y = +dm[4];
      if (y < 100) y += 2000;
      dt = `${y}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}`;
    }
  }
  t.split(/\n/).forEach((line) => {
    for (const [m, re] of LX) {
      if (re.test(line) && !out.some((o) => o.m === m)) {
        const x = line
          .slice(line.search(re))
          .replace(re, '')
          .replace(/25-?\s?(?:oh|hydroxy)\w*/gi, '')
          .match(/(\d+(?:\.\d+)?)/);
        if (x) out.push({ m, v: parseFloat(x[1]) });
      }
    }
  });
  return { dt, out };
}
function labImpCard() {
  return `<div class=card><h3>Import labs</h3><textarea id=lpt rows=4 placeholder="Paste lab results text">${esc(labPd)}</textarea><button class=btn data-a=lp style="margin-top:8px">Find results</button>${labPrev ? `<p class=sm>Found ${labPrev.out.length} results. Check them before importing.</p>${labPrev.out.map((o) => `<div class=sm style="color:var(--tx)">${esc(o.m)}: ${o.v}</div>`).join('')}<input type=date id=lpd value="${labPrev.dt}" style="margin:8px 0"><button class=btn data-a=li>Import ${labPrev.out.length}</button>` : ''}</div>`;
}
const doseLbl = (e) => e.m + ' ' + (e.f ? e.f + ' to ' : '') + e.t;
function allMarks() {
  const chg = (mem.chg || {}).r || [];
  return chg.concat(((mem.exp || {}).r || []).map((e) => ({ d: e.d, t: e.t }))).concat(
    doseLog()
      .filter((e) => !chg.some((c) => c.d === e.d && c.t === doseLbl(e)))
      .map((e) => ({ d: e.d, t: doseLbl(e) })),
  );
}
function expEval(e) {
  let b, a;
  if (EM.includes(e.m)) {
    const T = TR[e.m],
      ks = Object.keys(mem)
        .filter((k) => k.startsWith('d-'))
        .sort(),
      v = (k) => {
        const x = T.f(mem[k], k.slice(2));
        return x === '' || x == null || isNaN(x) ? null : +x;
      },
      B = ks
        .filter((k) => k.slice(2) < e.d && days2(k.slice(2), e.d) <= 28)
        .map(v)
        .filter((x) => x != null),
      A = ks
        .filter((k) => k.slice(2) >= e.d && days2(e.d, k.slice(2)) <= e.n)
        .map(v)
        .filter((x) => x != null);
    if (B.length < 3 || A.length < 3) return `needs 3+ days before and after (${B.length}/${A.length})`;
    b = mean(B);
    a = mean(A);
  } else {
    const R = ((mem.labs || {}).r || []).filter((x) => x.m === e.m).sort((x, y) => (x.d < y.d ? -1 : 1)),
      B = R.filter((x) => x.d < e.d).pop(),
      A = R.filter((x) => x.d >= e.d).pop();
    if (!B || !A) return 'needs a lab before and after';
    b = B.v;
    a = A.v;
  }
  return `${b.toFixed(1)} to ${a.toFixed(1)} (${a - b >= 0 ? '+' : ''}${(a - b).toFixed(1)})`;
}
function expCard() {
  const E = (mem.exp || {}).r || [],
    t = iso(new Date()),
    LM: string[] = [...new Set<string>(((mem.labs || {}).r || []).map((x) => x.m))];
  return `<div class=card><h3>Experiments</h3>${E.map((e, i) => `<div class=r><span><b>${esc(e.t)}</b> (${e.d.slice(5)})<br><small class=sm>${esc(e.m)}: ${expEval(e)}. ${e.rc <= t ? 'Recheck due.' : 'Recheck ' + e.rc.slice(5) + '.'}</small></span><button data-a=ex2 data-v=${i}>Remove</button></div>`).join('') || '<p class=sm>Test one change at a time. Pick what to measure and the app compares before and after.</p>'}<input type=text id=et placeholder="What are you changing?"><div class=g style="grid-template-columns:1fr 1fr"><select id=em>${EM.concat(
    LM,
  )
    .map((x) => `<option>${esc(x)}</option>`)
    .join(
      '',
    )}</select><input type=date id=ed value="${t}"></div><p class=sm>Measure, start date. Compares the 28 days before with the days after.</p><button class=btn data-a=ea>Start experiment</button></div>`;
}
function awakeCard() {
  const ks = Object.keys(mem)
      .filter((k) => k.startsWith('d-'))
      .sort(),
    it = (n) => all().find((x) => n.test(x.l)),
    mg = it(/magnesium/i),
    gl = it(/glycine/i),
    cj = it(/sample peptide/i),
    pw = it(/pre-workout/i),
    N = [];
  ks.forEach((k) => {
    const d = mem[k];
    if (d.aw === '' || d.aw == null) return;
    const pv = mem['d-' + addD(k.slice(2), -1)];
    if (!pv) return;
    const lm = (pv.nu || [])
        .filter((x) => x.t)
        .map((x) => +x.t.slice(0, 2) + +x.t.slice(3, 5) / 60)
        .sort((a, b) => a - b)
        .pop(),
      ev = mean([val(pv, 'bp.ev.0'), val(pv, 'bp.pm.0')]),
      c = pv.c || {},
      bt = d.bt ? (+d.bt.slice(0, 2) + +d.bt.slice(3, 5) / 60 - 18 + 24) % 24 : null;
    N.push({
      w: d.aw > 0,
      f: {
        'Last meal (hour)': lm,
        'Evening systolic': ev,
        'Bedtime (h after 6 PM)': bt,
        'Water (oz)': pv.w || null,
        'Magnesium taken': mg ? (c[mg.id] ? 1 : 0) : null,
        'Bedtime amino stack': gl ? (c[gl.id] ? 1 : 0) : null,
        'Peptide pin taken': cj ? (c[cj.id] ? 1 : 0) : null,
        'Pre-workout day': pw ? (c[pw.id] ? 1 : 0) : null,
      },
    });
  });
  const W = N.filter((n) => n.w),
    C = N.filter((n) => !n.w);
  if (W.length < 3 || C.length < 3)
    return `<div class=card><h3>Awakening analysis</h3><p class=sm>Needs at least 3 nights with wakes and 3 without, logged in Vitals under Overnight sleep. You have ${W.length} and ${C.length}.</p></div>`;
  const rows = Object.keys(N[0].f)
    .map((k) => {
      const a = mean(W.map((n) => n.f[k])),
        b = mean(C.map((n) => n.f[k]));
      if (a == null || b == null) return '';
      const pc = /taken|day/.test(k);
      return `<tr><td>${k}</td><td>${pc ? Math.round(a * 100) + '%' : a.toFixed(1)}</td><td>${pc ? Math.round(b * 100) + '%' : b.toFixed(1)}</td></tr>`;
    })
    .join('');
  return `<div class=card><h3>Awakening analysis</h3><table><tr><th></th><th>Wake nights (${W.length})</th><th>Calm nights (${C.length})</th></tr>${rows}</table><p class=sm>Compares the previous day with each night. It shows patterns, not causes.</p></div>`;
}
function procCard() {
  const pr = cfg().proc || {},
    seen = {},
    rows = all()
      .filter((x) => HOLDRE.test(x.l))
      .filter((x) => {
        const k = x.l.split(' ')[0];
        if (seen[k]) return false;
        seen[k] = 1;
        return true;
      }),
    t = iso(new Date());
  return `<div class=card><h3>Procedure prep</h3><p class=sm>Enter hold days only as your prescriber or surgeon instructs.</p><div class=g style="grid-template-columns:1fr 1fr"><input type=text id=pn value="${esc(pr.n || '')}" placeholder="Procedure"><input type=date id=pdt value="${pr.d || ''}"></div>${rows.map((x) => `<div class=g style="grid-template-columns:2fr 1fr"><span class=sm style="color:var(--tx)">${esc(x.l.slice(0, 34))}</span><input type=number data-ph=${x.id} placeholder="Days" value="${(pr.h || {})[x.id] ?? ''}"></div>`).join('')}<p class=sm>Also worth raising with your team: injectables, blood-pressure items, and hormones.</p><button class=btn data-a=pps>Save plan</button>${pr.d ? `<p class=sm>${days2(t, pr.d) >= 0 ? days2(t, pr.d) + ' days until ' + esc(pr.n || 'procedure') : 'Procedure date has passed.'}</p>` : ''}</div>`;
}
function procAlerts() {
  const pr = cfg().proc;
  if (!pr || !pr.d || !pr.h) return '';
  const t = iso(new Date());
  let h = '';
  Object.entries(pr.h).forEach(([id, n]) => {
    const x = all().find((y) => y.id === id);
    if (!x || !n) return;
    const stop = addD(pr.d, -n);
    if (t >= stop && t <= pr.d)
      h += `<div class=al>Hold ${esc(x.l.slice(0, 30))}: your plan says to stop ${n} days before ${esc(pr.n || 'the procedure')}.</div>`;
    else if (days2(t, stop) >= 0 && days2(t, stop) <= 3)
      h += `<div class=al>Stop ${esc(x.l.slice(0, 30))} on ${stop.slice(5)} for ${esc(pr.n || 'the procedure')}.</div>`;
  });
  return h;
}
function checkWindow(d, W) {
  let n = 0;
  d.c = d.c || {};
  items(date, false)
    .filter((x) => x.w === W)
    .forEach((x) => {
      if (!d.c[x.id]) {
        d.c[x.id] = 1;
        supAdj(x.id, true);
        vialAdj(x.id, true);
        n++;
      }
    });
  d.ws = d.ws || {};
  d.ws[W] = { s: 'taken' };
  return n;
}
const WIN_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
};
const WIN_RE: [RegExp, number][] = [
  [/\b(?:post[- ]?workout|breakfast|meal (?:one|1)\b)/, 2],
  [/\b(?:sweep (?:two|2)|second sweep|afternoon sweep)/, 7],
  [/\b(?:sweep (?:one|1)|first sweep|morning sweep|motility)/, 4],
  [/\b(?:meal (?:two|2)\b|organ stack|lunch)/, 5],
  [/\b(?:pre[- ]?bed)/, 9],
  [/\b(?:sleep stack|lights out|bedtime stack|bed stack)/, 10],
  [/\b(?:fasted|launch)/, 0],
  [/\b(?:training|workout|gym)/, 1],
  [/\b(?:medications?|meds|injections?|morning stack)/, 3],
  [/\b(?:midday|bp check|2 ?pm)/, 6],
  [/\b(?:dinner|evening)/, 8],
];
function parseToday(s) {
  const A = [];
  if (!/\b(?:took|taken|take|done|finished|finish|completed|checked?|did|had|ate)\b|\bwindow\b/.test(s))
    return A;
  const d = mem['d-' + date] || {},
    c = d.c || {},
    seen = new Set();
  const addWin = (i) => {
    if (i < 0 || i >= Wn.length || seen.has(i)) return;
    seen.add(i);
    const left = items(date, false).filter((x) => x.w === i && !c[x.id]).length;
    if (left)
      A.push({ t: 'win', v: i, l: `Window ${i + 1}: ${Wn[i][1]} (${left} item${left > 1 ? 's' : ''})` });
  };
  let m;
  const wm = s.matchAll(/\bwindow\s+(\d{1,2}|[a-z]+)/g);
  for (const x of wm) addWin((/^\d+$/.test(x[1]) ? +x[1] : WIN_WORDS[x[1]] || 0) - 1);
  let rest = s;
  WIN_RE.forEach(([re, i]) => {
    if (re.test(rest)) {
      addWin(i);
      rest = rest.replace(re, ' ');
    }
  });
  if (!A.length && !seen.size) {
    const toks = (s.match(
      /\b(?:took|taken|take|had)\s+(?:my\s+|the\s+|some\s+)?([a-z0-9-]{3,}(?:\s+[a-z0-9-]{1,}){0,1})/,
    ) || [])[1];
    if (toks) {
      const w = toks.split(/\s+/),
        tries = w.length > 1 ? [w.join(' '), w[0]] : [w[0]];
      for (const q of tries) {
        const it = items(date, false).find((x) => x.l.toLowerCase().includes(q) && !c[x.id]);
        if (it) {
          A.push({ t: 'item', v: it.id, l: it.l.slice(0, 40) });
          break;
        }
      }
    }
  }
  return A;
}
const NOHEAR = (sc) =>
  sc === 'today'
    ? 'Did not catch that. Try: took morning meds, or window 4 done.'
    : sc === 'fuel'
      ? 'Did not catch that. Try: ate eggs 520 calories 34 protein.'
      : 'Did not catch that. Try: BP 118 over 72, weight 204.6.';
function parseCmd(s, sc) {
  s = (s || '')
    .toLowerCase()
    .replace(/\bover\b/g, '/')
    .replace(/,/g, ' ');
  if (sc === 'today') return parseToday(s);
  const A = [];
  let m;
  if (sc === 'vitals') {
    if ((m = s.match(/(\d{2,3})\s*[\/-]\s*(\d{2,3})/)))
      A.push({ t: 'bp', v: [+m[1], +m[2]], l: 'BP ' + m[1] + '/' + m[2] });
    if (
      (m = s.match(/\bweigh(?:t| in)?\s*(\d{2,3}(?:\.\d)?)/) || s.match(/(\d{3}(?:\.\d)?)\s*(?:pounds|lbs?)/))
    )
      A.push({ t: 'wt', v: +m[1], l: 'Weight ' + m[1] });
    if ((m = s.match(/\b(?:slept|sleep)\s*(?:for\s*)?(\d(?:\.\d)?)/)))
      A.push({ t: 'sl', v: +m[1], l: 'Sleep ' + m[1] + ' h' });
    if ((m = s.match(/\b(?:resting hr|heart rate|hr|pulse)\b\s*(\d{2,3})/)))
      A.push({ t: 'hr', v: +m[1], l: 'HR ' + m[1] });
    if ((m = s.match(/\b(?:woke|wakes?|awakenings?)\s*(\d)/)))
      A.push({ t: 'aw', v: +m[1], l: 'Wakes ' + m[1] });
    if ((m = s.match(/\bnote\s+(.+)/))) A.push({ t: 'note', v: m[1], l: 'Note' });
  }
  if (sc === 'fuel') {
    if ((m = s.match(/(\d{1,3})\s*(?:oz|ounces?)\s*(?:of\s*)?water/) || s.match(/\bwater\s*(\d{1,3})/)))
      A.push({ t: 'water', v: +m[1], l: m[1] + ' oz water' });
    if (
      (m = s.match(
        /\b(?:ate|meal|had|log)\b\s*(.*?)\s*(\d{2,4})\s*(?:calories|cals?|kcal)(?:.*?(\d{1,3})\s*(?:g|grams?)?\s*protein)?/,
      ))
    ) {
      const n = (m[1] || '').trim() || 'Meal';
      A.push({ t: 'meal', v: { n, k: +m[2], p: +(m[3] || 0) }, l: n + ' ' + m[2] + ' kcal' });
    }
  }
  A.forEach((a) => {
    const w = actWarn(a);
    if (w) a.w = w;
  });
  return A;
}
function applyActs(A) {
  const d = JSON.parse(JSON.stringify(mem['d-' + date] || {})),
    h = new Date().getHours();
  A.forEach((a) => {
    if (a.t === 'bp') {
      const k = h < 12 ? 'am' : h < 17 ? 'pm' : 'ev';
      d.bp = d.bp || {};
      d.bp[k] = a.v;
    } else if (a.t === 'win') checkWindow(d, a.v);
    else if (a.t === 'item') {
      d.c = d.c || {};
      if (!d.c[a.v]) {
        d.c[a.v] = 1;
        supAdj(a.v, true);
        vialAdj(a.v, true);
      }
    } else if (a.t === 'wt') d.wt = a.v;
    else if (a.t === 'sl') d.sl = a.v;
    else if (a.t === 'hr') d.hr = a.v;
    else if (a.t === 'aw') d.aw = a.v;
    else if (a.t === 'note') d.nt = ((d.nt || '') + ' ' + a.v).trim();
    else if (a.t === 'water') d.w = (d.w || 0) + a.v;
    else if (a.t === 'meal')
      d.nu = (d.nu || []).concat({
        n: a.v.n,
        k: a.v.k,
        p: a.v.p,
        c: 0,
        f: 0,
        t: new Date().toTimeString().slice(0, 5),
      });
  });
  d.t = d.t || typeOf(date);
  put('d-' + date, d);
}
function vbar(sc, ph) {
  const on = listening && vsc === sc,
    mine = vsc === sc,
    off = !Voice.S || Voice.failed;
  return `<div class="cap ${on ? 'on' : ''}"><input type=text id=qc-${sc} data-vin enterkeyhint=send autocomplete=off placeholder="${on ? 'Listening...' : ph}"><button type=button class=go data-a=qc data-sc=${sc} aria-label="Preview">${ICS}</button></div>${
    mine && vacts.length
      ? `<div class=vp><div>${vacts.map((a) => `<span class="pill ${a.w ? 'warn' : ''}">${esc(a.l)}${a.w ? ' (check)' : ''}</span>`).join(' ')}</div>${
          vacts.some((a) => a.w)
            ? '<p class=vm>' +
              esc(
                vacts
                  .filter((a) => a.w)
                  .map((a) => a.w)
                  .join(' '),
              ) +
              ' Check before saving.</p>'
            : ''
        }<div class=vb><button class=btn data-a=vsave>Save</button><button class=lk data-a=vcancel>Cancel</button></div></div>`
      : ''
  }${mine && vmsg ? `<p class=vm role=status>${esc(vmsg)}</p>` : ''}`;
}
function fin(d, a, b) {
  return d.dn
    ? `<div class="card"><h3>Day complete</h3><p class=sm>Saved ${a} of ${b} items. You can still edit this day.</p><button class=btn data-a=nx>Go to next day</button> <button class=lk data-a=ro>Reopen</button></div>`
    : `<div class="card"><button class=btn data-a=fin style="width:100%;padding:14px">Complete day${b - a ? ' (' + (b - a) + ' unchecked)' : ''}</button><p class=sm>Everything saves as you go. Completing marks the day done in History.</p></div>`;
}
function render() {
  const d = mem['d-' + date] || {},
    t = typeOf(date),
    [a, b] = prog(date),
    isT = date === iso(new Date());
  const body =
    tab === 'today'
      ? todayV()
      : tab === 'vitals'
        ? vitalsV()
        : tab === 'fuel'
          ? fuelV()
          : tab === 'hist'
            ? histV()
            : moreV();
  $('#app').innerHTML =
    `<div class=w data-t="${tab}"><header><div class=dr><button data-a=p aria-label="Previous day">&#8249;</button><div class=dt><b>${fmt(date)}</b>${d.dn ? '<i style="color:var(--dn)">Day complete</i>' : ''}${isT ? '<i>Today</i>' : '<button class=lk data-a=td>Jump to today</button>'}</div><button data-a=n aria-label="Next day">&#8250;</button></div>
<div class=sg><button data-a=t data-v=L class="${t === 'L' ? 'on' : ''}">Lifting day</button><button data-a=t data-v=R class="${t === 'R' ? 'on' : ''}">Recovery day</button></div>${d.t ? '' : '<p class=ht>Suggested from your last days. Tap to confirm.</p>'}<div class=pg><svg viewBox="0 0 44 44" width=44 height=44><defs><linearGradient id=rg x1=0 y1=0 x2=1 y2=1><stop offset=0 style="stop-color:var(--nw)"/><stop offset=1 style="stop-color:var(--dn)"/></linearGradient></defs><circle cx=22 cy=22 r=18 class=rt0></circle><circle cx=22 cy=22 r=18 class=rt1 stroke-dasharray="${(b ? a / b : 0) * 113.1} 113.1"></circle></svg><div><b>${a} of ${b} done</b><span>${nextTxt()}</span></div></div></header>${warnHTML()}${body}${tab === 'today' || tab === 'vitals' ? fin(d, a, b) : ''}</div>
<nav>${[
      ['today', 'Today'],
      ['vitals', 'Vitals'],
      ['fuel', 'Fuel'],
      ['hist', 'History'],
      ['more', 'More'],
      ['sw', 'Lift'],
    ]
      .map(
        ([k, l]) =>
          `<button data-a=tab data-v=${k} class="${tab === k ? 'on' : ''}">${IC[k]}<span>${l}</span></button>`,
      )
      .join('')}</nav>`;
  afterRender();
}
function afterRender() {
  window.a11y && window.a11y($('#app'));
  if (wantNow && tab === 'today' && date === iso(new Date())) {
    wantNow = false;
    requestAnimationFrame(() => {
      scrollNow(false);
      updJump();
    });
  } else requestAnimationFrame(updJump);
}
function nowTarget() {
  return $('.win.foc') || $('.wh.now');
}
function scrollNow(smooth = true) {
  const t = nowTarget(),
    hd = $('header');
  if (!t) return;
  const top =
    t.getBoundingClientRect().top + window.scrollY - ((hd && hd.getBoundingClientRect().height) || 0) - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
}
function updJump() {
  const b = $('#jn') as HTMLElement,
    t = nowTarget();
  if (!b) return;
  const show =
    !!t &&
    tab === 'today' &&
    !edit &&
    date === iso(new Date()) &&
    (t.getBoundingClientRect().bottom < 120 || t.getBoundingClientRect().top > window.innerHeight - 140);
  b.hidden = !show;
}
let jr = 0;
window.addEventListener(
  'scroll',
  () => {
    cancelAnimationFrame(jr);
    jr = requestAnimationFrame(updJump);
  },
  { passive: true },
);
$('#jn').addEventListener('click', () => scrollNow());
const UNDO_MSG = {
  nx2: 'Meal removed',
  del: 'Item removed',
  arx: 'Alert rule removed',
  cx: 'Change removed',
  sx: 'Supply removed',
  vx: 'Vial removed',
  ex2: 'Experiment removed',
  nfx: 'Favorite removed',
  lu: 'Lab result removed',
};
const undoKey = (a: string) =>
  ({
    nx2: 'd-' + date,
    del: 'cfg',
    arx: 'cfg',
    cx: 'chg',
    sx: 'sup',
    vx: 'vials',
    ex2: 'exp',
    nfx: 'fav',
    lu: 'labs',
  })[a];
let undoSt: any = null,
  uto = 0;
function showUndo(k: string, snap: string, msg: string) {
  undoSt = { k, snap };
  const t = $('#ut') as HTMLElement;
  t.innerHTML = esc(msg) + ' <button data-a=undo>Undo</button>';
  t.hidden = false;
  clearTimeout(uto);
  uto = window.setTimeout(() => {
    t.hidden = true;
  }, 7000);
}
SR.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('#ut button');
  if (b && undoSt) {
    put(undoSt.k, JSON.parse(undoSt.snap));
    undoSt = null;
    ($('#ut') as HTMLElement).hidden = true;
    render();
  }
});
const app = $('#app');
app.addEventListener('click', async (e) => {
  const tp = e.target.closest && e.target.closest('[data-tp]');
  if (tp) {
    trendSel = +tp.getAttribute('data-tp');
    render();
    return;
  }
  const b = e.target.closest('button[data-a]');
  if (!b) return;
  const a = b.dataset.a,
    v = b.dataset.v,
    d = JSON.parse(JSON.stringify(mem['d-' + date] || {})),
    uk = undoKey(a),
    snap = uk ? JSON.stringify(mem[uk] ?? null) : null;
  if (a === 'p' || a === 'n') {
    date = addD(date, a === 'p' ? -1 : 1);
    resetOpen();
  } else if (a === 'td') {
    date = iso(new Date());
    resetOpen();
  } else if (a === 'tab') {
    if (v === 'sw') {
      window.gomod('l');
      return;
    }
    tab = v;
    vacts = [];
    vmsg = '';
  } else if (a === 'fsr') {
    runFind();
  } else if (a === 'fgo') {
    const fv = ($('#fd') as HTMLInputElement).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fv)) {
      date = fv;
      resetOpen();
      tab = 'today';
    }
  } else if (a === 'wkeep') {
    if (warn) setK(warn.k, warn.v);
    warn = null;
  } else if (a === 'wfix') {
    const wk = warn && warn.k;
    warn = null;
    setTimeout(() => {
      const el = wk && ($('[data-k="' + wk + '"]') as HTMLElement);
      el && el.focus();
    }, 60);
  } else if (a === 'sec') {
    secs.has(v) ? secs.delete(v) : secs.add(v);
  } else if (a === 'gbk') {
    tab = 'more';
    secs.add('reports');
  } else if (a === 'o') {
    opn.has(+v) ? opn.delete(+v) : opn.add(+v);
  } else if (a === 't') {
    d.t = v;
    put('d-' + date, d);
  } else if (a === 'e') {
    d.en = +v;
    put('d-' + date, d);
  } else if (a === 'h') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.hide = c.hide || {};
    c.hide[v] ? delete c.hide[v] : (c.hide[v] = 1);
    put('cfg', c);
  } else if (a === 'ed') {
    edit = !edit;
    if (edit) tab = 'today';
  } else if (a === 'add') {
    const l = $('#cl').value.trim();
    if (!l) return;
    const c = JSON.parse(JSON.stringify(cfg()));
    c.custom = (c.custom || []).concat({ w: +$('#cw').value, l, tag: $('#ct').value, d: ($('#cdy') && $('#cdy').value) || '' });
    put('cfg', c);
  } else if (a === 'del') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.custom.splice(+v, 1);
    put('cfg', c);
  } else if (a === 'fin') {
    window.pop && pop();
    d.t = d.t || typeOf(date);
    d.pd = prog(date);
    d.dn = Date.now();
    put('d-' + date, d);
    date = addD(date, 1);
    resetOpen();
    tab = 'today';
  } else if (a === 'nx') {
    date = addD(date, 1);
    resetOpen();
    tab = 'today';
  } else if (a === 'ro') {
    delete d.dn;
    delete d.pd;
    put('d-' + date, d);
  } else if (a === 'nm') {
    const m = MEALS[+v];
    d.nu = (d.nu || []).concat({
      n: m[0],
      k: m[1],
      p: m[2],
      c: m[3],
      f: m[4],
      t: new Date().toTimeString().slice(0, 5),
    });
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'nc2') {
    const k = +$('#nk').value || 0,
      pp = +$('#np').value || 0;
    if (!k && !pp) return;
    d.nu = (d.nu || []).concat({
      n: $('#nn').value.trim() || 'Meal',
      k,
      p: pp,
      c: +$('#nc').value || 0,
      f: +$('#nf').value || 0,
      t: new Date().toTimeString().slice(0, 5),
    });
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'nx2') {
    d.nu.splice(+v, 1);
    put('d-' + date, d);
  } else if (a === 'wt') {
    d.w = Math.max(0, (d.w || 0) + +v);
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'ls') {
    labSel = labSel === v ? null : v;
  } else if (a === 'ar') {
    const m = $('#am').value,
      o = $('#ao').value,
      vv = parseFloat($('#av').value),
      t = $('#at').value.trim();
    if (isNaN(vv)) return;
    const c = JSON.parse(JSON.stringify(cfg()));
    c.al = (c.al || []).concat({ m, o, v: vv, t: t || AM[m] + ' ' + o + ' ' + vv });
    put('cfg', c);
  } else if (a === 'arx') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.al.splice(+v, 1);
    put('cfg', c);
  } else if (a === 'tz') {
    window.setZoom(+v);
  } else if (a === 'fx') {
    window.setFx(v === 'lite');
  } else if (a === 'sa2') {
    const n = $('#sn').value.trim(),
      c = parseFloat($('#sc').value);
    if (!n || isNaN(c)) return;
    const S = JSON.parse(JSON.stringify(mem.sup || { r: [] })),
      k = $('#sk').value,
      q = parseFloat($('#sq').value);
    S.r.push({ n, c, o: '', k: k || null, q: k && q ? q : 0 });
    put('sup', S);
  } else if (a === 'nfv') {
    const k = +$('#nk').value || 0,
      pp = +$('#np').value || 0,
      n = $('#nn').value.trim();
    if (!n || (!k && !pp)) return;
    const F = JSON.parse(JSON.stringify(mem.fav || { r: [] }));
    F.r.push({ n, k, p: pp, c: +$('#nc').value || 0, f: +$('#nf').value || 0 });
    put('fav', F);
  } else if (a === 'nfa') {
    const x = mem.fav.r[+v];
    d.nu = (d.nu || []).concat({
      n: x.n,
      k: x.k,
      p: x.p,
      c: x.c,
      f: x.f,
      t: new Date().toTimeString().slice(0, 5),
    });
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'nfx') {
    const F = JSON.parse(JSON.stringify(mem.fav));
    F.r.splice(+v, 1);
    put('fav', F);
  } else if (a === 'ea') {
    const t = $('#et').value.trim(),
      dd = $('#ed').value.trim();
    if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(dd)) return;
    const E = JSON.parse(JSON.stringify(mem.exp || { r: [] }));
    E.r.push({ t, m: $('#em').value, d: dd, n: 28, rc: addD(dd, 42) });
    put('exp', E);
  } else if (a === 'ex2') {
    const E = JSON.parse(JSON.stringify(mem.exp));
    E.r.splice(+v, 1);
    put('exp', E);
  } else if (a === 'lp') {
    labPd = $('#lpt').value;
    labPrev = parseLabs(labPd);
  } else if (a === 'li') {
    const dt = $('#lpd').value.trim();
    if (!labPrev || !/^\d{4}-\d{2}-\d{2}$/.test(dt)) return;
    const L = JSON.parse(JSON.stringify(mem.labs || { r: [] }));
    labPrev.out.forEach((o) => L.r.push({ d: dt, m: o.m, v: o.v }));
    put('labs', L);
    labPrev = null;
    labPd = '';
  } else if (a === 'pps') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.proc = c.proc || {};
    c.proc.n = $('#pn').value.trim();
    c.proc.d = $('#pdt').value.trim();
    put('cfg', c);
  } else if (a === 'va') {
    const n = $('#vn').value.trim(),
      t = parseInt($('#vt').value),
      rd = $('#vd').value.trim(),
      sd = parseInt($('#vs').value) || 28;
    if (!n || !t) return;
    const V = JSON.parse(JSON.stringify(mem.vials || { r: [] }));
    V.r.push({
      n,
      t,
      c: t,
      rd: /^\d{4}-\d{2}-\d{2}$/.test(rd) ? rd : iso(new Date()),
      sd,
      k: $('#vk').value || null,
    });
    put('vials', V);
  } else if (a === 'vm') {
    const [i, n] = v.split('|'),
      V = JSON.parse(JSON.stringify(mem.vials));
    V.r[+i].c = Math.max(0, Math.min(V.r[+i].t, V.r[+i].c + +n));
    put('vials', V);
  } else if (a === 'vx') {
    const V = JSON.parse(JSON.stringify(mem.vials));
    V.r.splice(+v, 1);
    put('vials', V);
  } else if (a === 'ara') {
    const dt = $('#ad').value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) return;
    const c = JSON.parse(JSON.stringify(cfg()));
    c.act = c.act || {};
    c.act[$('#ai').value] = dt;
    put('cfg', c);
  } else if (a === 'arl') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.act = c.act || {};
    c.act[v] = iso(new Date());
    put('cfg', c);
  } else if (a === 'vla') {
    const vv = $('#lv2').value.trim(),
      t = $('#lt').value.trim();
    if (!t) return;
    const L = JSON.parse(JSON.stringify(mem.vlog || { r: [] }));
    L.r.push({ v: vv || 'Note', d: iso(new Date()), t });
    put('vlog', L);
  } else if (a === 'qc') {
    vsc = b.dataset.sc;
    vacts = parseCmd($('#qc-' + vsc).value, vsc);
    vmsg = vacts.length ? '' : NOHEAR(vsc);
  } else if (a === 'vsave') {
    applyActs(vacts);
    vacts = [];
    vmsg = 'Saved';
  } else if (a === 'vcancel') {
    vacts = [];
    vmsg = '';
  } else if (a === 'mic') {
    vsc = b.dataset.sc;
    if (listening) {
      Voice.stop();
      return;
    }
    vmsg = '';
    const ok = Voice.start(
      (tx, fin) => {
        const q = $('#qc-' + vsc);
        if (q) q.value = tx;
        if (fin) {
          vacts = parseCmd(tx, vsc);
          vmsg = vacts.length ? '' : NOHEAR(vsc);
          listening = false;
          render();
        }
      },
      () => {
        if (listening) {
          listening = false;
          render();
        }
      },
      (err) => {
        listening = false;
        vmsg =
          err === 'not-allowed' || err === 'service-not-allowed'
            ? 'Microphone is blocked here. Keyboard is open: tap the mic on your keyboard to dictate.'
            : err === 'timeout'
              ? 'No audio from the microphone. Keyboard is open: tap the mic on your keyboard to dictate.'
              : 'The Claude app blocks in-page voice. Keyboard is open: tap the mic on your keyboard to dictate.';
        render();
        setTimeout(() => {
          const q = $('#qc-' + vsc);
          if (q) q.focus();
        }, 60);
      },
    );
    if (ok) {
      listening = true;
      render();
    } else {
      setTimeout(() => {
        const q = $('#qc-' + vsc);
        if (q) q.focus();
      }, 60);
    }
  } else if (a === 'nt') {
    const [w, s] = v.split('|'),
      W = +w;
    d.ws = d.ws || {};
    d.t = d.t || typeOf(date);
    if (s === 'taken') {
      checkWindow(d, W);
    } else {
      d.ws[W] = { s };
      nudge = { w: W, s };
    }
    put('d-' + date, d);
  } else if (a === 'nr') {
    d.ws = d.ws || {};
    if (nudge && d.ws[nudge.w]) d.ws[nudge.w].r = v;
    nudge = null;
    put('d-' + date, d);
  } else if (a === 'qw') {
    d.w = (d.w || 0) + 8;
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'qg') {
    tab = v;
  } else if (a === 'cy2') {
    const y = mem['d-' + addD(date, -1)];
    if (!y || !y.nu) return;
    d.nu = (d.nu || []).concat(y.nu.map((x) => ({ ...x, t: new Date().toTimeString().slice(0, 5) })));
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'nrc') {
    const x = recents()[+v];
    d.nu = (d.nu || []).concat({
      n: x.n,
      k: x.k,
      p: x.p,
      c: x.c,
      f: x.f,
      t: new Date().toTimeString().slice(0, 5),
    });
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'pv') {
    const i = +v,
      j = phSel.indexOf(i);
    if (j >= 0) phSel.splice(j, 1);
    else {
      phSel.push(i);
      if (phSel.length > 2) phSel.shift();
    }
  } else if (a === 'pd') {
    const ids = phSel.map((i) => phs[i] && phs[i].id).filter(Boolean);
    Promise.all(ids.map((id) => IDB.phDel(id))).then(() => {
      phs = phs.filter((x) => !ids.includes(x.id));
      phSel = [];
      render();
    });
    return;
  } else if (a === 'tc') {
    tcode = await enc(window.Cloud.gather());
    try {
      await navigator.clipboard.writeText(tcode);
    } catch (x) {}
  } else if (a === 'tr') {
    trend = v;
    trendSel = null;
  } else if (a === 'tr2') {
    trendRange = +v;
    trendSel = null;
  } else if (a === 'mp' || a === 'mn') {
    const [y, m] = mo.split('-').map(Number),
      x = new Date(y, m - 1 + (a === 'mp' ? -1 : 1), 1);
    mo = iso(x).slice(0, 7);
  } else if (a === 'cd') {
    date = v;
    resetOpen();
    tab = 'today';
  } else if (a === 'dr') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.draw = $('#nd').value.trim();
    c.dint = +$('#ni').value;
    put('cfg', c);
  } else if (a === 'dn') {
    d.dose = d.dose || {};
    d.dose[v] = Object.assign(d.dose[v] || {}, { t: new Date().toTimeString().slice(0, 5) });
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'tour') {
    try {
      localStorage.removeItem('tour');
    } catch (x) {}
    window.tour && window.tour();
  } else if (a === 'ics') {
    const d0 = iso(new Date()).replace(/-/g, ''),
      ev = Wn.map((w, i) =>
        [
          'BEGIN:VEVENT',
          'UID:win' + i + '@daily',
          'DTSTAMP:' + d0 + 'T000000Z',
          'DTSTART:' + d0 + 'T' + w[0].replace(':', '') + '00',
          'RRULE:FREQ=DAILY',
          'SUMMARY:' + w[1],
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'DESCRIPTION:' + w[1],
          'TRIGGER:PT0M',
          'END:VALARM',
          'END:VEVENT',
        ].join('\r\n'),
      );
    try {
      const dl = await claude.use('downloads');
      if (dl)
        await dl.save({
          filename: 'protocol-windows.ics',
          data: ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Daily//EN']
            .concat(ev, ['END:VCALENDAR'])
            .join('\r\n'),
        });
    } catch (x) {}
  } else if (a === 'cy') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.cyc = { s: $('#cs').value.trim() || iso(new Date()), cap: +$('#cc').value, wo: +$('#cw2').value };
    put('cfg', c);
  } else if (a === 'ca') {
    const t = $('#ct2').value.trim();
    if (!t) return;
    const C = JSON.parse(JSON.stringify(mem.chg || { r: [] }));
    C.r.push({ d: iso(new Date()), t, rc: addD(iso(new Date()), 42) });
    put('chg', C);
  } else if (a === 'dla') {
    const m = $('#dlm1').value.trim(),
      f = $('#dlf').value.trim(),
      t = $('#dlt').value.trim(),
      dd = $('#dld').value,
      y = $('#dly').value.trim();
    if (!m || !t || !/^\d{4}-\d{2}-\d{2}$/.test(dd)) return;
    const D = JSON.parse(JSON.stringify(mem.dh || { r: [] }));
    D.r.push({ d: dd, m, f, t, y });
    put('dh', D);
    if ($('#dlr').checked) {
      const C = JSON.parse(JSON.stringify(mem.chg || { r: [] }));
      C.r.push({ d: dd, t: doseLbl({ m, f, t }), rc: addD(dd, 42) });
      put('chg', C);
    }
  } else if (a === 'dlx') {
    const D = JSON.parse(JSON.stringify(mem.dh || { r: [] }));
    D.r.splice(+v, 1);
    put('dh', D);
  } else if (a === 'ti') {
    tiSel = +v;
  } else if (a === 'wro') {
    wkOff = +v;
  } else if (a === 'gwr' || a === 'wrx') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.wrSeen = wkKey();
    put('cfg', c);
    if (a === 'gwr') {
      tab = 'hist';
      wkOff = 0;
    }
  } else if (a === 'wpdf') {
    try {
      const dl = await claude.use('downloads');
      if (dl) {
        const r = reviewModel(wkOff);
        await dl.save({
          filename: 'weekly-review-' + r.cur.to + '.pdf',
          data: window.Pdf.buildWeek(r),
        });
      }
    } catch (x) {}
  } else if (a === 'cx') {
    const C = JSON.parse(JSON.stringify(mem.chg));
    C.r.splice(+v, 1);
    put('chg', C);
  } else if (a === 'sk') {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.sick = !c.sick;
    put('cfg', c);
  } else if (a === 'th') {
    window.setTheme(v);
  } else if (a === 'pn') {
    const pn = $('#pin').value.trim();
    if (!/^\d{4,8}$/.test(pn)) return;
    await window.setPin(pn);
  } else if (a === 'pc') {
    await window.setPin('');
  } else if (a === 'is') {
    const [id, s] = v.split('|');
    d.inj = d.inj || {};
    d.inj[id] === s ? delete d.inj[id] : (d.inj[id] = s);
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'wev') {
    d.t = d.t || typeOf(date);
    EVE.forEach((w) => checkWindow(d, w));
    if (!d.bt) {
      const n = new Date();
      d.bt = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    }
    put('d-' + date, d);
  } else if (a === 'wall') {
    d.t = d.t || typeOf(date);
    checkWindow(d, +v);
    put('d-' + date, d);
  } else if (a === 'cbk') {
    window.Cloud.backup(true);
  } else if (a === 'cvf') {
    await window.Cloud.verify();
    if (window.Cloud.st.verified) {
      const c = JSON.parse(JSON.stringify(cfg()));
      c.lastVerify = iso(new Date());
      put('cfg', c);
    }
  } else if (a === 'crs') {
    window.Cloud.restore();
  } else if (a === 'sum') {
    sumT = sumText();
  } else if (a === 'pdf') {
    try {
      const dl = await claude.use('downloads');
      if (dl)
        await dl.save({
          filename: 'protocol-summary-' + iso(new Date()) + '.pdf',
          data: window.Pdf.build(reportModel()),
        });
    } catch (x) {}
  } else if (a === 'sdl') {
    try {
      const dl = await claude.use('downloads');
      if (dl) await dl.save({ filename: 'protocol-summary.txt', data: sumT });
    } catch (x) {}
  } else if (a === 'xa') {
    opn = opn.size >= Wn.length - 1 ? new Set() : new Set(Wn.map((w, i) => i));
  } else if (a === 'sd') {
    const [id, n] = v.split('|'),
      x = all().find((y) => y.id === id),
      c = JSON.parse(JSON.stringify(cfg()));
    c.sch = c.sch || {};
    const s = (c.sch[id] || sch(x)).slice(),
      i = s.indexOf(+n);
    i < 0 ? s.push(+n) : s.splice(i, 1);
    c.sch[id] = s.sort();
    put('cfg', c);
  } else if (a === 'sy') {
    d.sy = d.sy || [];
    const i = d.sy.indexOf(v);
    i < 0 ? d.sy.push(v) : d.sy.splice(i, 1);
    d.t = d.t || typeOf(date);
    put('d-' + date, d);
  } else if (a === 'sa') {
    const n = $('#sn').value.trim(),
      c = parseInt($('#sc').value);
    if (!n || isNaN(c)) return;
    const S = JSON.parse(JSON.stringify(mem.sup || { r: [] }));
    S.r.push({ n, c, o: $('#so').value.trim() });
    put('sup', S);
  } else if (a === 'sm') {
    const [i, n] = v.split('|'),
      S = JSON.parse(JSON.stringify(mem.sup));
    S.r[+i].c = Math.max(0, S.r[+i].c + +n);
    put('sup', S);
  } else if (a === 'sx') {
    const S = JSON.parse(JSON.stringify(mem.sup));
    S.r.splice(+v, 1);
    put('sup', S);
  } else if (a === 'bk') {
    const A = window.Cloud.gather(),
      c = JSON.parse(JSON.stringify(cfg()));
    c.lastBk = iso(new Date());
    put('cfg', c);
    try {
      const dl = await claude.use('downloads');
      if (dl) await dl.save({ filename: 'daily-backup.json', data: JSON.stringify(A) });
    } catch (x) {}
  } else if (a === 'rs') {
    try {
      const tv = $('#rs').value.trim(),
        o = tv.startsWith('DLY1:') ? await dec(tv) : JSON.parse(tv);
      Object.keys(o).forEach((k) =>
        /^(w-|wcfg$|prog$)/.test(k) && window.L_ ? L_.put(k, o[k]) : put(k, o[k]),
      );
    } catch (x) {
      return;
    }
  } else if (a === 'lab') {
    const m = $('#lm').value.trim(),
      v = parseFloat($('#lv').value),
      dd = $('#ld').value.trim();
    if (!m || isNaN(v) || !/^\d{4}-\d{2}-\d{2}$/.test(dd)) return;
    const L = JSON.parse(JSON.stringify(mem.labs || { r: [] }));
    L.r.push({ d: dd, m, v });
    put('labs', L);
  } else if (a === 'lu') {
    const L = JSON.parse(JSON.stringify(mem.labs || { r: [] }));
    L.r.pop();
    put('labs', L);
  } else if (a === 'csv') {
    const rows = [
      [
        'date',
        'type',
        'done',
        'total',
        'bp_am',
        'bp_2pm',
        'bp_pm',
        'weight',
        'sleep_h',
        'wakes',
        'energy',
        'notes',
      ],
    ];
    Object.keys(mem)
      .filter((k) => k.startsWith('d-'))
      .sort()
      .forEach((k) => {
        const s = k.slice(2),
          x = mem[k],
          [p, n] = prog(s),
          g = (y) => val(x, y) ?? '';
        rows.push([
          s,
          typeOf(s),
          p,
          n,
          g('bp.am.0') + '/' + g('bp.am.1'),
          g('bp.pm.0') + '/' + g('bp.pm.1'),
          g('bp.ev.0') + '/' + g('bp.ev.1'),
          g('wt'),
          g('sl'),
          g('aw'),
          g('en'),
          '"' + (x.nt || '').replace(/"/g, '""') + '"',
        ]);
      });
    try {
      const dl = await claude.use('downloads');
      if (dl) await dl.save({ filename: 'protocol-log.csv', data: rows.map((r) => r.join(',')).join('\n') });
    } catch (e) {}
  }
  if (uk && snap !== JSON.stringify(mem[uk] ?? null)) showUndo(uk, snap, UNDO_MSG[a]);
  render();
  if (['p', 'n', 'td', 'tab', 'fin', 'nx', 'cd', 'gwr'].includes(a)) {
    scrollTo(0, 0);
    const w = $('.w');
    w && w.classList.add('go');
  }
});
app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'fq') {
    runFind();
    render();
  } else if (e.key === 'Enter' && e.target.hasAttribute && e.target.hasAttribute('data-vin')) {
    vsc = e.target.id.slice(3);
    vacts = parseCmd(e.target.value, vsc);
    vmsg = vacts.length ? '' : NOHEAR(vsc);
    render();
  }
});
app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.k === 'bt' || t.dataset.k === 'wk') {
    setK(t.dataset.k, t.value);
    const dd = mem['d-' + date] || {};
    if (dd.bt && dd.wk) {
      const mn =
        +dd.wk.slice(0, 2) * 60 + +dd.wk.slice(3, 5) - (+dd.bt.slice(0, 2) * 60 + +dd.bt.slice(3, 5));
      setK('sl', Math.round(((mn + 1440) % 1440) / 6) / 10);
    }
    render();
    return;
  }
  if (t.dataset.ph) {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.proc = c.proc || {};
    c.proc.h = c.proc.h || {};
    c.proc.h[t.dataset.ph] = t.value === '' ? undefined : +t.value;
    put('cfg', c);
    return;
  }
  if (t.id === 'pf') {
    addPhoto(t.files[0]);
    return;
  }
  if (t.dataset.gd) {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.gd = +t.value;
    put('cfg', c);
    render();
    return;
  }
  if (t.dataset.nt) {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.nt = c.nt || {};
    c.nt[t.dataset.nt] = Number(t.value) || 0;
    put('cfg', c);
    render();
    return;
  }
  if (t.dataset.ds) {
    const d = JSON.parse(JSON.stringify(mem['d-' + date] || {}));
    d.dose = d.dose || {};
    d.dose[t.dataset.ds] = Object.assign(d.dose[t.dataset.ds] || {}, { v: t.value });
    put('d-' + date, d);
    return;
  }
  if (t.hasAttribute('data-hold')) {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.hold = t.value;
    put('cfg', c);
    return;
  }
  if (t.dataset.lb) {
    const c = JSON.parse(JSON.stringify(cfg()));
    c.lab = c.lab || {};
    c.lab[t.dataset.lb] = t.value;
    put('cfg', c);
    return;
  }
  if (t.dataset.c) {
    navigator.vibrate && navigator.vibrate(8);
    const d = JSON.parse(JSON.stringify(mem['d-' + date] || {}));
    d.c = d.c || {};
    d.t = d.t || typeOf(date);
    t.checked ? (d.c[t.dataset.c] = 1) : delete d.c[t.dataset.c];
    supAdj(t.dataset.c, t.checked);
    vialAdj(t.dataset.c, t.checked);
    put('d-' + date, d);
    render();
  } else if (t.dataset.k) {
    if (t.type === 'number' && t.value !== '') {
      const nv = Number(t.value),
        wm = rangeMsg(t.dataset.k, nv);
      if (wm) {
        warn = { k: t.dataset.k, v: nv, msg: wm };
        render();
        return;
      }
    }
    warn = null;
    setK(t.dataset.k, t.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value);
    if (t.type === 'number') render();
  }
});
window.P_ = {
  mem: () => mem,
  put: (k, v) => put(k, v),
  g: () => date,
  s: (v) => {
    date = v;
    resetOpen();
  },
  r: () => render(),
  get: (s, k) => (mem['d-' + s] || {})[k],
  hist: (k, n) =>
    Object.keys(mem)
      .filter((x) => x.startsWith('d-'))
      .sort()
      .slice(-n)
      .map((x) => mem[x][k])
      .filter(Boolean),
  set: (s, k, v) => {
    const d = JSON.parse(JSON.stringify(mem['d-' + s] || {}));
    d[k] = v;
    put('d-' + s, d);
    render();
  },
};
window.tour = () => {
  const S = [
    [
      'Today',
      'Check items off as you go. Your lift day sets the protocol day type, and each window opens as its time arrives.',
    ],
    [
      'Vitals and labs',
      'Log BP, sleep, symptoms, doses and lab results. Ranges and draw dates are in More.',
    ],
    ['Lift', 'Switch with the bottom bar. Log sets, RIR, cardio and joints, and see weekly sets per muscle.'],
    [
      'Your data',
      'Trends, the calendar, the weekly review, backups, and the prescriber summary are in History and More.',
    ],
  ];
  // The installed app opens on Lift, so the tour starts there too.
  let onLift = false;
  try {
    onLift = !!(window as any).DAILY_STANDALONE && (localStorage.getItem('side') || 'l') === 'l';
  } catch (x) {}
  if (onLift) {
    S.splice(2, 1);
    S.unshift(['Lift', 'This is your workout log. Log sets, RIR, cardio and joints, and see weekly sets per muscle. The bottom bar switches to your daily checklist.']);
  }
  let i = 0;
  const o = document.createElement('div');
  o.style.cssText =
    'position:fixed;inset:0;background:rgba(120,150,220,.25);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:90;display:grid;place-content:center;padding:24px';
  const end = () => {
      o.remove();
      try {
        localStorage.setItem('tour', '1');
      } catch (x) {}
    },
    r = () => {
      o.innerHTML = `<div style="background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(26px);backdrop-filter:blur(26px);color:#14213d;border:1px solid rgba(255,255,255,.9);box-shadow:0 20px 50px -12px rgba(46,70,140,.4);border-radius:26px;padding:22px;max-width:320px;font:16px system-ui"><b style="font-size:20px">${S[i][0]}</b><p>${S[i][1]}</p><div style="display:flex;justify-content:space-between"><button id=tk style="color:#56657f;background:none;border:0;font:inherit">Skip</button><button id=tn style="background:#2f6bff;color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;font-weight:600">${i < 3 ? 'Next' : 'Done'}</button></div></div>`;
      (o.querySelector('#tk') as HTMLElement).onclick = end;
      (o.querySelector('#tn') as HTMLElement).onclick = () => {
        if (i < 3) {
          i++;
          r();
        } else end();
      };
    };
  r();
  document.body.appendChild(o);
};
try {
  if (!localStorage.getItem('tour')) setTimeout(() => window.tour(), 700);
} catch (e) {}
boot().then(() => {
  resetOpen();
  render();
});
render();
