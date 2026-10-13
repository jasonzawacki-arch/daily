export {};
window.IDB = (() => {
  let db;
  const open = () =>
    db ||
    (db = new Promise((res, rej) => {
      const r = indexedDB.open('daily', 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        ['kv', 'ph'].forEach((n) => {
          if (!d.objectStoreNames.contains(n)) d.createObjectStore(n);
        });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  const all = async (st) => {
      const d = await open();
      return new Promise((res, rej) => {
        const o = {},
          c = d.transaction(st).objectStore(st).openCursor();
        c.onsuccess = (e) => {
          const x = e.target.result;
          if (x) {
            o[x.key] = x.value;
            x.continue();
          } else res(o);
        };
        c.onerror = () => rej(c.error);
      });
    },
    set = async (st, k, v) => {
      const d = await open();
      return new Promise((res, rej) => {
        const t = d.transaction(st, 'readwrite');
        t.objectStore(st).put(v, k);
        t.oncomplete = res;
        t.onerror = () => rej(t.error);
      });
    },
    del = async (st, k) => {
      const d = await open();
      return new Promise((res, rej) => {
        const t = d.transaction(st, 'readwrite');
        t.objectStore(st).delete(k);
        t.oncomplete = res;
        t.onerror = () => rej(t.error);
      });
    };
  return {
    all: () => all('kv'),
    set: (k, v) => set('kv', k, v),
    phAll: async () => Object.values(await all('ph')),
    phSet: (k, v) => set('ph', k, v),
    phDel: (k) => del('ph', k),
  };
})();
window.DBREADY = (async () => {
  try {
    const a = await IDB.all();
    if (a._migrated) return;
    const docs = {};
    try {
      const u = await claude.use('user'),
        id = u && (await u.id()),
        db = await claude.use('db');
      if (id && db)
        (await db.collection('data/users/' + id).get()).docs.forEach((d) => (docs[d.id] = d.data()));
    } catch (e) {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^(pl|wl):/.test(k)) {
          const kk = k.slice(3);
          if (!(kk in docs)) docs[kk] = JSON.parse(localStorage.getItem(k));
        }
      }
    } catch (e) {}
    for (const k in docs) await IDB.set(k, docs[k]);
    await IDB.set('_migrated', 1);
  } catch (e) {}
  try {
    navigator.storage && navigator.storage.persist && navigator.storage.persist();
  } catch (e) {}
})();
