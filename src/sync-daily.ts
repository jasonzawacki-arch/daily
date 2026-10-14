// Optional Google Drive sync for the installed app (not inside Claude, which has its own cloud backup).
// Items are the app's storage keys (days, lifts, settings, regimen, program...); photos stay on the device.
import { Sync, type Items, type SyncState } from './gsync.js';
import { clientId } from './gsync-config.js';

const W = window as any,
  LIFT = /^(w-|wcfg$|prog$)/;

function data(): Record<string, unknown> {
  const p = W.P_ ? W.P_.mem() : {},
    l = W.L_ ? W.L_.mem() : {},
    o: Record<string, unknown> = {};
  for (const k of Object.keys(p)) if (!LIFT.test(k) && k[0] !== '_') o[k] = p[k];
  for (const k of Object.keys(l)) if (LIFT.test(k) && k[0] !== '_') o[k] = l[k];
  return o;
}

let sync: Sync | null = null,
  applying = false;
const chip = document.createElement('button');
chip.id = 'gsc';
chip.type = 'button';
chip.hidden = true;
chip.addEventListener('click', () => sync && sync.now(true));

function shown(s: SyncState) {
  chip.hidden = !s.on || !(s.tap || s.busy);
  chip.textContent = s.busy ? 'Syncing...' : 'Sync';
  chip.disabled = s.busy;
  chip.title = s.msg || 'Sync with Google Drive';
  try {
    W.P_ && W.P_.r();
  } catch (e) {}
}

if (W.DAILY_STANDALONE && clientId())
  (W.DBREADY || Promise.resolve()).then(() => {
    sync = new Sync(
      'daily',
      clientId(),
      {
        async items() {
          const d = data(),
            mt = await W.IDB.mtAll(),
            it: Items = {};
          for (const k of Object.keys(d)) it[k] = { t: mt[k] || 0, v: d[k] };
          for (const k of Object.keys(mt)) if (!(k in d) && k[0] !== '_' && mt[k]) it[k] = { t: mt[k], v: null };
          return it;
        },
        async apply(items, keys) {
          applying = true;
          for (const k of keys) {
            const x = items[k],
              lift = LIFT.test(k) && W.L_;
            if (x.v === null) (lift ? W.L_ : W.P_).del(k);
            else (lift ? W.L_ : W.P_).put(k, x.v);
            W.IDB.mark(k, x.t);
          }
          applying = false;
          W.P_.r();
          W.L_ && W.L_.r();
        },
        hasData: () => Object.keys(data()).some((k) => /^(d-|w-|labs$|dh$|vials$|reg$)/.test(k)),
      },
      shown,
    );
    W.GSync = sync;
    document.body.appendChild(chip);
    W.IDB.onChange = () => !applying && sync && sync.changed();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && sync) sync.now(false);
    });
    shown(sync.state);
  });
