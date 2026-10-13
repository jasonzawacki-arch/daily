export {};
window.Voice = {
  S: window.SpeechRecognition || window.webkitSpeechRecognition,
  failed: false,
  rec: null,
  wd: 0,
  start(onText, onEnd, onErr) {
    if (!this.S || this.failed) {
      onErr('unsupported');
      return false;
    }
    try {
      const r = (this.rec = new this.S()),
        V = this;
      let got = false;
      r.lang = 'en-US';
      r.interimResults = true;
      clearTimeout(V.wd);
      V.wd = setTimeout(
        () => {
          if (!got) {
            V.failed = true;
            try {
              r.abort();
            } catch (x) {}
            onErr('timeout');
          } else {
            try {
              r.stop();
            } catch (x) {}
          }
        },
        got ? 12000 : 3500,
      );
      r.onaudiostart = () => {
        got = true;
        clearTimeout(V.wd);
        V.wd = setTimeout(() => {
          try {
            r.stop();
          } catch (x) {}
        }, 15000);
      };
      r.onresult = (e) => {
        got = true;
        onText(
          Array.from(e.results)
            .map((x) => x[0].transcript)
            .join(' '),
          e.results[e.results.length - 1].isFinal,
        );
      };
      r.onerror = (e) => {
        clearTimeout(V.wd);
        if (e.error === 'aborted' || e.error === 'no-speech') {
          return;
        }
        if (
          [
            'not-allowed',
            'service-not-allowed',
            'audio-capture',
            'network',
            'language-not-supported',
          ].includes(e.error)
        )
          V.failed = true;
        onErr(e.error);
      };
      r.onend = () => {
        clearTimeout(V.wd);
        onEnd();
      };
      r.start();
      return true;
    } catch (x) {
      this.failed = true;
      onErr('unsupported');
      return false;
    }
  },
  stop() {
    clearTimeout(this.wd);
    try {
      this.rec && this.rec.stop();
    } catch (x) {}
  },
};
