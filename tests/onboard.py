"""Play Store polish: first-run program setup, template tags, one-tap set logging, the deferred backup offer,
and the Android back gesture in the installed app.
Run: node build.mjs && python3 tests/onboard.py"""
import datetime, functools, http.server, json, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parent.parent / "dist" / "site"
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{httpd.server_address[1]}/"
fails, errs = [], []


def check(name, ok, detail=""):
    print(("OK  " if ok else "FAIL"), name, detail)
    if not ok:
        fails.append(name)


td = datetime.date.today()
with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. A brand-new install: setup sheet first, then the tour.
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1600)
    L = lambda s: pg.locator("#hl " + s)
    check("setup sheet on first run", L("#ob:not([hidden]) .obw").count() == 1)
    check("no sign-in asked up front", "google" not in L("#ob").inner_text().lower())
    n_all = L("#ob .obt").count()
    check("all templates listed", n_all >= 15, n_all)
    L("#ob button[data-ob=lv][data-v=Beginner]").click(); pg.wait_for_timeout(200)
    n_beg = L("#ob .obt").count()
    check("experience filter narrows the list", 0 < n_beg < n_all, n_beg)
    L("#ob button[data-ob=u][data-v=kg]").click(); pg.wait_for_timeout(200)
    L("#ob .obt:has-text('GZCLP')").click(); pg.wait_for_timeout(500)
    check("sheet closes after a pick", L("#ob").is_hidden())
    check("picked program is in use", "squat" in L("header .dt b").inner_text().lower(), L("header .dt b").inner_text())
    check("units saved", pg.evaluate("L_.mem().wcfg.u") == "kg")
    check("tour follows setup", pg.locator("#tn").count() == 1)
    pg.locator("#tk").click(); pg.wait_for_timeout(200)
    pg.reload(); pg.wait_for_timeout(1500)
    check("setup does not come back", L("#ob").is_hidden() and pg.locator("#tn").count() == 0)
    ctx.close()

    # 2. Look around with sample data instead.
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    pg = ctx.new_page()
    pg.goto(BASE); pg.wait_for_timeout(1600)
    L = lambda s: pg.locator("#hl " + s)
    L("#ob button[data-ob=skip]").click(); pg.wait_for_timeout(300)
    check("skip keeps the sample program", pg.evaluate("L_.mem().prog.name") == "Dorian Yates HIT")
    ctx.close()

    # 3. One-tap sets, from last session; the backup offer after 3 finished workouts.
    days = [(td - datetime.timedelta(days=i)).isoformat() for i in (6, 4, 2)]
    seed = "localStorage.setItem('tour','1');localStorage.setItem('onb','1');localStorage.setItem('side','l');"
    ctx = b.new_context(viewport={"width": 390, "height": 844})
    ctx.add_init_script(seed)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1500)
    L = lambda s: pg.locator("#hl " + s)
    tpl = json.loads((SITE.parent.parent / "src" / "programs.json").read_text())
    full = next(t for t in tpl if t["name"] == "Full body 3 days")
    pg.evaluate("""([P, ds]) => {
      L_.put('prog', {name: P.name, days: [P.days[0], {n: 'Rest', off: true, ex: []}].map(d => ({...d, ex: d.ex.map(e => ({t: '', ...e}))}))});
      ds.forEach(s => L_.put('w-' + s, {k: 1, dn: 1, sets: {[P.days[0].ex[0].n]: [{w: 100, r: 5}, {w: 100, r: 5}, {w: 100, r: 5}]}}));
      L_.put('wcfg', {start: ds[0]});
      L_.s(new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)); L_.r();
    }""", [full, days])
    pg.wait_for_timeout(300)
    first = full["days"][0]["ex"][0]["n"]
    card = L(f".card:has(h3:text('{first}'))")
    card.locator("button.ck").first.click(); pg.wait_for_timeout(300)
    w = card.locator("input[data-s$='|0|w']").input_value(); r = card.locator("input[data-s$='|0|r']").input_value()
    check("one tap logs the suggested set", w != "" and r != "", (w, r))
    check("one tap starts the rest timer", L("#tm").is_visible())
    check("set marked done", card.locator(".sr b.ok").count() == 1)
    L("#tm").click()
    big = [b_.bounding_box() for b_ in L(".sr .ck").all()[:3]]
    check("set buttons are 44 px targets", all(x and x["width"] >= 44 and x["height"] >= 44 for x in big), big)
    gs = pg.evaluate("!!window.GSync")
    if gs:
        L("button[data-a=fin]").click(); pg.wait_for_timeout(400)
        check("backup offered after 3+ workouts", L("button[data-a=bkon]").count() == 1)
        L("button[data-a=bkno]").click(); pg.wait_for_timeout(300)
        check("Not now is remembered", L("button[data-a=bkon]").count() == 0)

    # 4. Back gesture: from another tab it returns to Today instead of closing the app.
    L("nav button[data-a=tab][data-v=hist]").click(); pg.wait_for_timeout(300)
    pg.go_back(); pg.wait_for_timeout(400)
    check("back returns to Today", L(".w").get_attribute("data-t") == "today")

    # 5. Program tab: templates grouped by level, with tags.
    L("nav button[data-a=tab][data-v=prog]").click(); pg.wait_for_timeout(300)
    check("template groups", L("#tpl optgroup").count() == 3)
    check("template tags", L(".tgs span").count() >= 3, L(".tgs").first.inner_text())
    pg.screenshot(path=str(Path("/tmp") / "onboard-prog.png"))
    b.close()

check("no page errors", not errs, errs)
httpd.shutdown()
print(f"{'FAIL' if fails else 'OK'}: {len(fails)} failed")
raise SystemExit(1 if fails else 0)
