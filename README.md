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

## Tech

TypeScript (Shadow DOM, IndexedDB), a dependency-free custom bundler (`build.mjs`), and Python/Playwright end-to-end tests.

## Build & test

```sh
npm install                           # installs the TypeScript compiler
node build.mjs                          # -> dist/daily.html
tsc -p .                                # type-check
python3 tests/smoke.py dist/daily.html  # Playwright smoke test
```

## Data

Ships with clearly-labeled **sample data** so every feature is demonstrable out of the box. Replace it with your own regimen — user data is stored locally in IndexedDB and never leaves the device.
