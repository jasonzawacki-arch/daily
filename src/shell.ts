export {};
const T = { p: document.getElementById('hp'), l: document.getElementById('hl') },
  LK = document.getElementById('lock');
window.pop = () => {
  try {
    navigator.vibrate && navigator.vibrate([30, 40, 30]);
  } catch (e) {}
  const c = ['#FF8A5B', '#FFC15A', '#4FE0A8', '#7AA7FF', '#E056A0'];
  for (let i = 0; i < 28; i++) {
    const d = document.createElement('i');
    d.className = 'pf';
    d.style.cssText = `left:50%;top:60%;background:${c[i % 5]};--x:${(Math.random() - 0.5) * 340}px;--y:${-120 - Math.random() * 260}px;--r:${Math.random() * 720}deg`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }
};
const PH = () => {
    const n = new Date(),
      h = n.getHours() + n.getMinutes() / 60;
    return h < 3.3 || h >= 21 ? 'night' : h < 5.5 ? 'pre' : h < 8 ? 'dawn' : h < 17 ? 'day' : 'dusk';
  },
  SP = () => [T.p, T.l, document.body].forEach((x) => x.setAttribute('data-ph', PH()));
SP();
setInterval(SP, 60000);
window.setFx = (on) => {
  try {
    localStorage.removeItem('fxauto');
    localStorage.setItem('fx', on ? 'lite' : 'full');
  } catch (e) {}
  [T.p, T.l, document.body].forEach((h) =>
    on ? h.setAttribute('data-fx', 'lite') : h.removeAttribute('data-fx'),
  );
};
window.setZoom = (z) => {
  try {
    localStorage.setItem('zoom', z);
  } catch (e) {}
  [T.p, T.l].forEach((h) => (h.style.zoom = z));
};
try {
  // An earlier build could switch to reduced effects automatically; undo that once.
  if (localStorage.getItem('fxauto')) {
    localStorage.removeItem('fxauto');
    localStorage.removeItem('fx');
  }
  if (localStorage.getItem('fx') === 'lite') window.setFx(true);
  const z = +localStorage.getItem('zoom');
  if (z) window.setZoom(z);
} catch (e) {}
window.gomod = (m) => {
  const f = m === 'l' ? P_ : L_,
    t = m === 'l' ? L_ : P_;
  t.s(f.g());
  t.r();
  T.p.style.display = m === 'l' ? 'none' : '';
  T.l.style.display = m === 'l' ? '' : 'none';
  scrollTo(0, 0);
  try {
    localStorage.setItem('side', m === 'l' ? 'l' : 'p');
  } catch (e) {}
};
// The installed app opens on Lift the first time, then on whichever side you used last.
if ((window as any).DAILY_STANDALONE) {
  let side = 'l';
  try {
    side = localStorage.getItem('side') || 'l';
  } catch (e) {}
  if (side === 'l') {
    (window.DBREADY || Promise.resolve()).then(() => {
      const go = (n) => (window.P_ && window.L_ ? window.gomod('l') : n > 0 && setTimeout(() => go(n - 1), 50));
      setTimeout(() => go(100), 0);
    });
  }
}
window.setTheme = (x) => {
  try {
    localStorage.setItem('theme', x);
  } catch (e) {}
  [T.p, T.l].forEach((h) => (x ? h.setAttribute('data-theme', x) : h.removeAttribute('data-theme')));
  const e = x || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', e);
};
try {
  window.setTheme(localStorage.getItem('theme') || 'light');
} catch (e) {
  window.setTheme('light');
}
const H = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('dl' + s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
window.setPin = async (p) => {
  try {
    p ? localStorage.setItem('pinh', await H(p)) : localStorage.removeItem('pinh');
  } catch (e) {}
  P_.r();
};
const pinOn = () => {
  try {
    return localStorage.getItem('pinh');
  } catch (e) {
    return null;
  }
};
if (pinOn()) LK.style.display = 'grid';
document.getElementById('lb').onclick = async () => {
  const v = (document.getElementById('lp') as HTMLInputElement).value;
  if ((await H(v)) === pinOn()) {
    LK.style.display = 'none';
    (document.getElementById('lp') as HTMLInputElement).value = '';
  }
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden && pinOn()) LK.style.display = 'grid';
});

// Accessibility pass run after every render: labels, pressed/expanded state, hidden decorative icons.
window.a11y = (root: any) => {
  root.querySelectorAll('input,select,textarea').forEach((el: any) => {
    if (el.type === 'checkbox' || el.type === 'hidden' || el.hasAttribute('aria-label')) return;
    const base = (
      (el.closest('div')?.querySelector('label.f') as HTMLElement | null)?.textContent ||
      (el.parentElement?.querySelector('span') as HTMLElement | null)?.textContent ||
      ''
    ).trim();
    const lab = base
      ? el.placeholder && el.placeholder !== base
        ? base + ' ' + el.placeholder
        : base
      : el.placeholder || el.dataset.k || '';
    if (lab) el.setAttribute('aria-label', lab);
  });
  root
    .querySelectorAll('.chips button,.en button,.inj button,.dc button,.sg button,.thumbs button')
    .forEach((b: any) => b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'));
  root
    .querySelectorAll('button[data-a=o]')
    .forEach((b: any) => b.setAttribute('aria-expanded', b.nextElementSibling ? 'true' : 'false'));
  root.querySelectorAll('nav button.on').forEach((b: any) => b.setAttribute('aria-current', 'page'));
  root.querySelectorAll('button svg,.pg svg').forEach((s: any) => s.setAttribute('aria-hidden', 'true'));
  root.querySelectorAll('.al').forEach((a: any) => a.getAttribute('role') || a.setAttribute('role', 'note'));
};
