// Minimal dependency-free PDF writer (one letter page, Helvetica) for the clinician summary.
export {};

type RGB = [number, number, number];
const W = 612;
const H = 792;
const SUB: Record<string, string> = {
  '–': '-',
  '—': '-',
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '▲': '^',
  '▼': 'v',
  '·': '-',
};
const clean = (s: any) =>
  String(s)
    .replace(/[^\x20-\x7e]/g, (c) => SUB[c] || '?')
    .replace(/[\\()]/g, (c) => '\\' + c);
const f = (n: number) => (Math.round(n * 100) / 100).toString();

class Page {
  ops: string[] = [];
  text(
    x: number,
    y: number,
    s: any,
    size = 10,
    bold = false,
    c: RGB = [0.1, 0.12, 0.18],
    anchor: 'l' | 'r' | 'c' = 'l',
  ) {
    const wd = String(s).length * size * 0.5;
    const xx = anchor === 'r' ? x - wd : anchor === 'c' ? x - wd / 2 : x;
    this.ops.push(
      `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${f(c[0])} ${f(c[1])} ${f(c[2])} rg ${f(xx)} ${f(H - y)} Td (${clean(s)}) Tj ET`,
    );
  }
  line(x1: number, y1: number, x2: number, y2: number, w = 0.5, c: RGB = [0.75, 0.78, 0.85]) {
    this.ops.push(
      `${f(w)} w ${f(c[0])} ${f(c[1])} ${f(c[2])} RG ${f(x1)} ${f(H - y1)} m ${f(x2)} ${f(H - y2)} l S`,
    );
  }
  rect(x: number, y: number, w: number, h: number, fill: RGB, stroke?: RGB) {
    this.ops.push(
      `${f(fill[0])} ${f(fill[1])} ${f(fill[2])} rg ${f(x)} ${f(H - y - h)} ${f(w)} ${f(h)} re f`,
    );
    if (stroke)
      this.ops.push(
        `0.5 w ${f(stroke[0])} ${f(stroke[1])} ${f(stroke[2])} RG ${f(x)} ${f(H - y - h)} ${f(w)} ${f(h)} re S`,
      );
  }
  poly(pts: [number, number][], w = 1.4, c: RGB = [0.12, 0.31, 0.85]) {
    if (pts.length < 2) return;
    this.ops.push(
      `${f(w)} w ${f(c[0])} ${f(c[1])} ${f(c[2])} RG 1 J 1 j ` +
        pts.map((p, i) => `${f(p[0])} ${f(H - p[1])} ${i ? 'l' : 'm'}`).join(' ') +
        ' S',
    );
  }
  dot(x: number, y: number, r = 2, c: RGB = [0.12, 0.31, 0.85]) {
    this.rect(x - r, y - r, r * 2, r * 2, c);
  }
}

function assemble(p: Page): Uint8Array {
  const content = p.ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const off: number[] = [];
  objs.forEach((o, i) => {
    off.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xr = out.length;
  out +=
    `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
    off.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
  const b = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) b[i] = out.charCodeAt(i) & 255;
  return b;
}

const INK: RGB = [0.1, 0.12, 0.18];
const MUTED: RGB = [0.4, 0.45, 0.55];
const BLUE: RGB = [0.12, 0.31, 0.85];
const AMBER: RGB = [0.75, 0.4, 0.0];
const GREEN: RGB = [0.04, 0.54, 0.35];

function chart(
  p: Page,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  series: { pts: (number | null)[]; c: RGB }[],
  band?: [number, number],
  unit = '',
) {
  p.rect(x, y, w, h, [0.97, 0.98, 1], [0.85, 0.88, 0.94]);
  p.text(x + 8, y + 13, title, 9, true);
  const all = series.flatMap((s) => s.pts.filter((v): v is number => v != null));
  if (all.length < 2) {
    p.text(x + 8, y + h / 2 + 4, 'Not enough data', 9, false, MUTED);
    return;
  }
  let lo = Math.min(...all, band ? band[0] : Infinity);
  let hi = Math.max(...all, band ? band[1] : -Infinity);
  const pad = (hi - lo) * 0.12 || 1;
  lo -= pad;
  hi += pad;
  const L = x + 34,
    R = x + w - 10,
    T = y + 24,
    B = y + h - 14;
  const Y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const n = Math.max(...series.map((s) => s.pts.length));
  const X = (i: number) => L + (n > 1 ? (i / (n - 1)) * (R - L) : 0);
  if (band) p.rect(L, Y(band[1]), R - L, Math.max(1, Y(band[0]) - Y(band[1])), [0.86, 0.95, 0.9]);
  [0, 1, 2].forEach((k) => {
    const v = lo + ((hi - lo) * k) / 2;
    p.line(L, Y(v), R, Y(v), 0.3, [0.85, 0.88, 0.94]);
    p.text(L - 4, Y(v) + 3, Math.round(v * 10) / 10, 7, false, MUTED, 'r');
  });
  series.forEach((s) => {
    const pts: [number, number][] = [];
    s.pts.forEach((v, i) => v != null && pts.push([X(i), Y(v)]));
    p.poly(pts, 1.3, s.c);
    pts.forEach((q) => p.dot(q[0], q[1], 1.6, s.c));
  });
  if (unit) p.text(x + w - 8, y + 13, unit, 7, false, MUTED, 'r');
}

export interface ReportModel {
  from: string;
  to: string;
  generated: string;
  nDays: number;
  adherence: number | null;
  bpAvg: [number, number] | null;
  bpLow: number | null;
  bpN: number;
  sleepAvg: number | null;
  weightChange: number | null;
  wakesAvg: number | null;
  missed: number;
  days: { sys: number | null; dia: number | null; wt: number | null; sl: number | null }[];
  symptoms: [string, number][];
  labs: { m: string; v: number; d: string; chg: number | null; lo?: number; hi?: number; flag: string }[];
}

function build(m: ReportModel): Uint8Array {
  const p = new Page();
  const X0 = 40,
    X1 = W - 40;
  p.text(X0, 52, 'Protocol summary', 20, true);
  p.text(
    X0,
    68,
    `${m.from} to ${m.to}  -  ${m.nDays} logged days  -  generated ${m.generated}`,
    9,
    false,
    MUTED,
  );
  p.line(X0, 78, X1, 78, 0.8, [0.6, 0.65, 0.75]);
  // stat tiles
  const tiles: [string, string, RGB][] = [
    [
      'Adherence',
      m.adherence == null ? '-' : Math.round(m.adherence) + '%',
      m.adherence != null && m.adherence < 70 ? AMBER : GREEN,
    ],
    ['Avg BP', m.bpAvg ? `${Math.round(m.bpAvg[0])}/${Math.round(m.bpAvg[1])}` : '-', INK],
    [
      'Lowest systolic',
      m.bpLow == null ? '-' : String(m.bpLow),
      m.bpLow != null && m.bpLow < 110 ? AMBER : INK,
    ],
    ['Avg sleep', m.sleepAvg == null ? '-' : m.sleepAvg.toFixed(1) + ' h', INK],
    [
      'Weight change',
      m.weightChange == null ? '-' : (m.weightChange > 0 ? '+' : '') + m.weightChange.toFixed(1),
      INK,
    ],
    ['2-3 AM wakes', m.wakesAvg == null ? '-' : m.wakesAvg.toFixed(1) + '/night', INK],
  ];
  const tw = (X1 - X0 - 5 * 8) / 6;
  tiles.forEach((t, i) => {
    const x = X0 + i * (tw + 8);
    p.rect(x, 90, tw, 46, [0.97, 0.98, 1], [0.85, 0.88, 0.94]);
    p.text(x + 8, 105, t[0], 7.5, false, MUTED);
    p.text(x + 8, 126, t[1], 14, true, t[2]);
  });
  p.text(X0, 150, `BP readings: ${m.bpN}. Missed or skipped windows: ${m.missed}.`, 8, false, MUTED);
  chart(
    p,
    X0,
    160,
    X1 - X0,
    150,
    'Blood pressure (daily average) - shaded band is protocol target 115-122',
    [
      { pts: m.days.map((d) => d.sys), c: BLUE },
      { pts: m.days.map((d) => d.dia), c: AMBER },
    ],
    [115, 122],
    'systolic blue, diastolic amber',
  );
  const cw = (X1 - X0 - 10) / 2;
  chart(p, X0, 320, cw, 110, 'Weight (lb)', [{ pts: m.days.map((d) => d.wt), c: GREEN }]);
  chart(p, X0 + cw + 10, 320, cw, 110, 'Sleep (h)', [{ pts: m.days.map((d) => d.sl), c: BLUE }], [7, 9]);
  // symptoms
  let y = 452;
  p.text(X0, y, 'Symptoms logged', 11, true);
  y += 14;
  if (m.symptoms.length)
    m.symptoms.slice(0, 7).forEach(([s, n]) => {
      p.text(X0 + 4, y, s, 9);
      p.text(X0 + 180, y, `${n} day${n > 1 ? 's' : ''}`, 9, false, MUTED);
      y += 12;
    });
  else {
    p.text(X0 + 4, y, 'None logged', 9, false, MUTED);
    y += 12;
  }
  // labs
  y = Math.max(y + 12, 452 + 14 + 12 * 7 + 12);
  p.text(X0, y, 'Latest labs', 11, true);
  y += 6;
  const cols = [X0 + 4, X0 + 170, X0 + 240, X0 + 330, X0 + 420];
  ['Marker', 'Value', 'Typical range', 'Change', 'Date'].forEach((h, i) =>
    p.text(cols[i], y + 8, h, 8, true, MUTED),
  );
  y += 13;
  p.line(X0, y, X1, y, 0.5);
  const maxRows = Math.max(0, Math.floor((H - 70 - y) / 12));
  const rows = m.labs.slice(0, maxRows);
  if (!rows.length) p.text(X0 + 4, y + 11, 'No lab results logged', 9, false, MUTED);
  rows.forEach((r, i) => {
    const yy = y + 11 + i * 12;
    p.text(cols[0], yy, r.m, 9);
    p.text(cols[1], yy, r.v + (r.flag ? ' ' + r.flag : ''), 9, !!r.flag, r.flag ? AMBER : INK);
    p.text(cols[2], yy, r.lo != null ? `${r.lo}-${r.hi}` : '-', 9, false, MUTED);
    p.text(cols[3], yy, r.chg == null ? '-' : (r.chg > 0 ? '+' : '') + +r.chg.toFixed(2), 9, false, MUTED);
    p.text(cols[4], yy, r.d, 9, false, MUTED);
  });
  if (m.labs.length > rows.length)
    p.text(
      X0 + 4,
      y + 11 + rows.length * 12,
      `+${m.labs.length - rows.length} more markers in the app`,
      8,
      false,
      MUTED,
    );
  p.line(X0, H - 46, X1, H - 46, 0.5);
  p.text(
    X0,
    H - 32,
    "Self-tracked log from the Daily app. Not a medical record or medical advice. Typical ranges are general adult ranges; use your lab's ranges.",
    7.5,
    false,
    MUTED,
  );
  return assemble(p);
}

const wrap = (t: string, n: number) => {
  const out: string[] = [];
  let cur = '';
  String(t)
    .split(/\s+/)
    .forEach((w) => {
      if ((cur + ' ' + w).trim().length > n) {
        out.push(cur);
        cur = w;
      } else cur = (cur + ' ' + w).trim();
    });
  if (cur) out.push(cur);
  return out;
};

// One-page weekly review. `r` comes from reviewModel() in protocol.ts.
function buildWeek(r: any): Uint8Array {
  const c = r.cur,
    pv = r.prev,
    p = new Page(),
    X0 = 40,
    X1 = W - 40,
    sg = (v: number | null, d = 0, u = '') => (v == null ? '-' : (v > 0 ? '+' : '') + v.toFixed(d) + u);
  p.text(X0, 52, 'Weekly review', 20, true);
  p.text(
    X0,
    68,
    `${c.from} to ${c.to}  -  ${c.nDays} of 7 days logged  -  generated ${new Date().toISOString().slice(0, 10)}`,
    9,
    false,
    MUTED,
  );
  p.line(X0, 78, X1, 78, 0.8, [0.6, 0.65, 0.75]);
  const L = c.lift,
    tiles: [string, string, string, RGB][] = [
      [
        'Adherence',
        c.adherence == null ? '-' : Math.round(c.adherence) + '%',
        pv.adherence == null || c.adherence == null ? '' : sg(c.adherence - pv.adherence, 0, ' pts'),
        c.adherence != null && c.adherence < 70 ? AMBER : GREEN,
      ],
      [
        'Avg BP',
        c.sys == null ? '-' : Math.round(c.sys) + '/' + Math.round(c.dia || 0),
        pv.sys == null || c.sys == null ? '' : sg(c.sys - pv.sys, 0, ' sys'),
        INK,
      ],
      [
        'Avg sleep',
        c.sleep == null ? '-' : c.sleep.toFixed(1) + ' h',
        pv.sleep == null || c.sleep == null ? '' : sg(c.sleep - pv.sleep, 1, ' h'),
        INK,
      ],
      ['Weight change', c.wt == null ? '-' : sg(c.wt, 1), '', INK],
      [
        'Lift sessions',
        L ? String(L.n) : '-',
        L && L.n ? Math.round(L.v).toLocaleString() + ' ' + L.u : '',
        INK,
      ],
      ['New PRs', L ? String(L.pr.length) : '-', '', INK],
    ];
  const tw = (X1 - X0 - 5 * 8) / 6;
  tiles.forEach((t, i) => {
    const x = X0 + i * (tw + 8);
    p.rect(x, 90, tw, 52, [0.97, 0.98, 1], [0.85, 0.88, 0.94]);
    p.text(x + 8, 104, t[0], 7.5, false, MUTED);
    p.text(x + 8, 124, t[1], 14, true, t[3]);
    if (t[2]) p.text(x + 8, 136, t[2], 7, false, MUTED);
  });
  const inj =
    c.inj
      .slice(0, 4)
      .map((x: any) => `${String(x.n).slice(0, 22)} ${x.taken}/${x.due}`)
      .join('   ') + (c.inj.length > 4 ? `   +${c.inj.length - 4} more` : '');
  p.text(X0, 156, inj ? 'Injections logged: ' + inj : 'No injections scheduled this week', 8, false, MUTED);
  chart(
    p,
    X0,
    166,
    X1 - X0,
    130,
    'Blood pressure by day - shaded band is protocol target 115-122',
    [
      { pts: c.days.map((d: any) => d.sys), c: BLUE },
      { pts: c.days.map((d: any) => d.dia), c: AMBER },
    ],
    [115, 122],
    'systolic blue, diastolic amber',
  );
  const cw = (X1 - X0 - 10) / 2;
  chart(
    p,
    X0,
    306,
    cw,
    100,
    'Adherence by day (%)',
    [{ pts: c.days.map((d: any) => d.pc), c: GREEN }],
    [90, 100],
  );
  chart(p, X0 + cw + 10, 306, cw, 100, 'Sleep (h)', [{ pts: c.days.map((d: any) => d.sl), c: BLUE }], [7, 9]);
  let y = 428;
  p.text(X0, y, 'Adherence by window', 11, true);
  y += 12;
  c.byWin.forEach((w: any, i: number) => {
    if (!w.tot) return;
    const pct = w.pct as number;
    p.text(X0 + 4, y + 7, `${r.times[i]} ${r.names[i]}`, 8.5);
    p.rect(X0 + 210, y, 250, 8, [0.9, 0.92, 0.96]);
    p.rect(X0 + 210, y, Math.max(1, (250 * pct) / 100), 8, pct < 80 ? AMBER : GREEN);
    p.text(X1, y + 7, Math.round(pct) + '%', 8.5, true, INK, 'r');
    y += 13.5;
  });
  y = Math.max(y + 14, 612);
  const colW = (X1 - X0 - 20) / 2,
    list = (x: number, title: string, rows: string[], empty: string) => {
      p.text(x, y, title, 11, true);
      let yy = y + 14,
        n = 0;
      (rows.length ? rows : [empty]).forEach((t) => {
        wrap(t, 54).forEach((ln, j) => {
          if (n++ < 9)
            p.text(x + (j ? 8 : 0), yy, (j ? '' : '- ') + ln, 8.5, false, rows.length ? INK : MUTED);
          yy += 11;
        });
      });
    };
  list(X0, 'What slipped', r.slip, 'Nothing stands out.');
  list(X0 + colW + 20, 'What went well', r.win, 'Log more days for highlights.');
  p.line(X0, H - 46, X1, H - 46, 0.5);
  p.text(
    X0,
    H - 32,
    'Self-tracked log from the Daily app. Not a medical record or medical advice. Bring changes to your prescriber.',
    7.5,
    false,
    MUTED,
  );
  return assemble(p);
}

window.Pdf = { build, buildWeek };
