# Daily

A configurable daily regimen + lifting tracker. TypeScript source compiles to **one self-contained HTML file** — no server, no framework, no build dependencies beyond the TypeScript compiler.

## What it does

- **Daily checkoffs** — regimen items organized into time windows (morning, training, meals, evening, pre-bed), with weekday / day-of-week filters and date-gated items
- **Dose planner** — "up next" scheduling, missed-dose flags, and a dose-change log with chart markers
- **Titration view** — weight, blood pressure, and sleep trends around dose changes, with lab values overlaid
- **Injection-site rotation** — site maps with rotation rules per injectable type
- **Lift tracking** — workout templates, set logging with validation warnings, progressive-overload analytics, weekly volume by muscle
- **Reports** — one-page PDF summaries and weekly reviews
- **Local-first** — all data stays in IndexedDB on the device; optional cloud backup to the user's own store
- **Extras** — dark/light themes with contrast auditing, PIN lock, voice input for logging

## Install on your phone

**https://jasonzawacki-arch.github.io/daily/** is the same app, published from this repository. Open it in Chrome on Android, then tap the menu (three dots) and **Install app**. It gets its own icon and works offline.

- It starts with the sample regimen. Make it yours under **More > Customize and settings**: rename or hide sample items and add your own. To bring over data you already have, use **Backup** (or **Transfer code**) where you have it now, then **Restore from pasted backup** in the app.
- Everything stays in the phone's browser storage. Download a backup now and then (**More > Reports and backup**); clearing Chrome's site data deletes the app's data.
- Cloud backup needs Daily to be opened inside Claude, so in the installed app it explains that instead.

*Publishing (once, for the repository owner):* **Settings > Pages > Source: GitHub Actions**. The `phone app` workflow then publishes `dist/site` on every push to `main`.

## Tech

TypeScript (Shadow DOM, IndexedDB), a dependency-free custom bundler (`build.mjs`), and Python/Playwright end-to-end tests.

## Build & test

```sh
npm install                           # installs the TypeScript compiler
node build.mjs                          # -> dist/daily.html, and dist/site/ (the installable app)
tsc -p .                                # type-check
python3 tests/smoke.py dist/daily.html  # Playwright smoke test
python3 tests/standalone.py             # the installed app: no Claude, offline, backup files
```

## Data

Ships with clearly-labeled **sample data** so every feature is demonstrable out of the box. Replace it with your own regimen — user data is stored locally in IndexedDB and never leaves the device.
