// Cloud backup: mirrors all local data into the viewer's private Claude db (never shared).
// Photos are excluded (large). Restore overwrites keys present in the backup.
export {};

const CHUNK = 180_000; // chars per doc (docs are limited to 256 KiB)
const MIN_GAP = 10 * 60_000; // auto-backup at most every 10 minutes
const DELAY = 30_000; // wait this long after the last change

const st = { at: 0, keys: 0, size: 0, busy: false, msg: '', checked: false, confirm: false, verified: false };
let timer: any = 0;
let last = 0;
let dirty = false;

const changed = () => {
  try {
    window.P_ && window.P_.r();
  } catch (e) {}
};

async function col() {
  const u = await claude.use('user');
  const db = await claude.use('db');
  const id = u && (await u.id());
  return db && id ? db.collection('data/users/' + id + '/cloud/bk') : null;
}

// Each module keeps its own in-memory copy, so take lift keys from Lift and everything else from Protocol.
const LIFT_KEY = /^(w-|wcfg$|prog$)/;
function gather(): Record<string, any> {
  const p = window.P_.mem();
  const l = window.L_ ? window.L_.mem() : {};
  const o: Record<string, any> = {};
  Object.keys(p).forEach((k) => {
    if (!LIFT_KEY.test(k)) o[k] = p[k];
  });
  Object.keys(l).forEach((k) => {
    if (LIFT_KEY.test(k)) o[k] = l[k];
  });
  // Backups carry the regimen in use, so restoring on a new device (or in the installed app) brings it along.
  if (!o.reg && window.P_.reg) o.reg = window.P_.reg();
  return o;
}

async function pack(o: any): Promise<string> {
  const s = new Blob([JSON.stringify(o)]).stream().pipeThrough(new CompressionStream('gzip'));
  const b = new Uint8Array(await new Response(s).arrayBuffer());
  let t = '';
  b.forEach((x) => (t += String.fromCharCode(x)));
  return btoa(t);
}
async function unpack(c: string): Promise<any> {
  const b = Uint8Array.from(atob(c), (x) => x.charCodeAt(0));
  const s = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(s).text());
}

async function loadMeta() {
  try {
    const c = await col();
    if (!c) return;
    const m = await c.doc('meta').get();
    if (m.exists) {
      const d: any = m.data();
      st.at = d.at || 0;
      st.keys = d.keys || 0;
      st.size = d.size || 0;
    }
  } catch (e) {}
  st.checked = true;
  changed();
}

async function backup(manual = false) {
  if (st.busy) return;
  st.busy = true;
  st.confirm = false;
  if (manual) {
    st.msg = 'Backing up...';
    changed();
  }
  try {
    const c = await col();
    if (!c) {
      st.msg = 'Cloud backup needs this page opened while signed in to Claude.';
      return;
    }
    const data = gather();
    const txt = await pack(data);
    const n = Math.max(1, Math.ceil(txt.length / CHUNK));
    for (let i = 0; i < n; i++) await c.doc('c' + i).set({ i, d: txt.slice(i * CHUNK, (i + 1) * CHUNK) });
    const prev = await c.doc('meta').get();
    const old = prev.exists ? Number((prev.data() as any).n) || 0 : 0;
    for (let i = n; i < old; i++) await c.doc('c' + i).delete();
    const at = Date.now();
    await c.doc('meta').set({ at, n, size: txt.length, keys: Object.keys(data).length });
    st.at = at;
    st.keys = Object.keys(data).length;
    st.size = txt.length;
    last = at;
    dirty = false;
    st.msg = manual ? 'Backed up just now.' : '';
  } catch (e: any) {
    st.msg = 'Backup failed: ' + String((e && e.message) || e).slice(0, 80);
  } finally {
    st.busy = false;
    changed();
  }
}

async function restore() {
  if (st.busy) return;
  if (!st.confirm) {
    st.confirm = true;
    st.msg = 'Tap Restore again to overwrite this device with the cloud copy.';
    changed();
    return;
  }
  st.busy = true;
  st.confirm = false;
  st.msg = 'Restoring...';
  changed();
  try {
    const c = await col();
    if (!c) {
      st.msg = 'Cloud restore needs this page opened while signed in to Claude.';
      return;
    }
    const m = await c.doc('meta').get();
    if (!m.exists) {
      st.msg = 'No cloud backup found yet.';
      return;
    }
    const n = Number((m.data() as any).n) || 0;
    let txt = '';
    for (let i = 0; i < n; i++) {
      const s = await c.doc('c' + i).get();
      if (!s.exists) throw new Error('backup is incomplete');
      txt += (s.data() as any).d;
    }
    const o = await unpack(txt);
    Object.keys(o).forEach((k) =>
      /^(w-|wcfg$|prog$)/.test(k) && window.L_ ? window.L_.put(k, o[k]) : window.P_.put(k, o[k]),
    );
    window.L_ && window.L_.r();
    st.msg = 'Restored ' + Object.keys(o).length + ' items from the cloud copy.';
  } catch (e: any) {
    st.msg = 'Restore failed: ' + String((e && e.message) || e).slice(0, 80);
  } finally {
    st.busy = false;
    changed();
  }
}

// Reads the cloud copy and compares it with this device without changing either one.
async function verify() {
  if (st.busy) return;
  st.busy = true;
  st.verified = false;
  st.msg = 'Checking the cloud copy...';
  changed();
  try {
    const c = await col();
    if (!c) {
      st.msg = 'Verifying needs this page opened while signed in to Claude.';
      return;
    }
    const m = await c.doc('meta').get();
    if (!m.exists) {
      st.msg = 'No cloud backup found yet.';
      return;
    }
    const n = Number((m.data() as any).n) || 0;
    let txt = '';
    for (let i = 0; i < n; i++) {
      const s = await c.doc('c' + i).get();
      if (!s.exists) throw new Error('piece ' + (i + 1) + ' of ' + n + ' is missing');
      txt += (s.data() as any).d;
    }
    const cloud = await unpack(txt),
      here = gather(),
      same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b),
      ck = Object.keys(cloud),
      lk = Object.keys(here),
      diff = ck.filter((k) => k in here && !same(cloud[k], here[k])).length,
      onlyHere = lk.filter((k) => !(k in cloud)).length,
      onlyCloud = ck.filter((k) => !(k in here)).length;
    st.verified = true;
    st.msg =
      `Backup is readable and complete (${ck.length} items).` +
      (diff || onlyHere
        ? ` This device has ${diff + onlyHere} newer or new item${diff + onlyHere > 1 ? 's' : ''} that the next backup will include.`
        : ' It matches this device.') +
      (onlyCloud ? ` ${onlyCloud} item${onlyCloud > 1 ? 's' : ''} exist only in the cloud copy.` : '');
  } catch (e: any) {
    st.msg = 'Backup check failed: ' + String((e && e.message) || e).slice(0, 80);
  } finally {
    st.busy = false;
    changed();
  }
}

function touch() {
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(
    () => {
      if (dirty) backup(false);
    },
    Math.max(DELAY, last + MIN_GAP - Date.now()),
  );
}

window.Cloud = { st, touch, backup, restore, gather, verify };
setTimeout(() => {
  (window.DBREADY || Promise.resolve()).then(loadMeta);
}, 1500);
