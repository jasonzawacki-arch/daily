// Lets Daily run on its own (for example as the installed phone app from GitHub Pages), not only inside Claude.
// Inside Claude, window.claude provides downloads, the signed-in user and a cloud database. Outside Claude this
// stand-in provides downloads as normal browser downloads and reports no user or cloud database, so cloud
// backup explains itself instead of failing. It also registers the offline worker for the installed app.
export {};

const w = window as any;
if (typeof w.claude === 'undefined') {
  w.DAILY_STANDALONE = true;
  w.claude = {
    async use(name: string) {
      if (name === 'downloads') {
        return {
          async save(f: { filename: string; data: string | Blob; type?: string }) {
            const blob = f.data instanceof Blob ? f.data : new Blob([f.data], { type: f.type || 'text/plain;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = f.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          },
        };
      }
      return null; // no Claude user or cloud database here
    },
  };
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => undefined));
  }
}
