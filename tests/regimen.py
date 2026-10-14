"""Regimen files in the installable app (dist/site): save the built-in regimen, load another one, refuse a bad file,
carry the regimen in backups, restore a backup file, and switch back to the built-in regimen.
Run: node build.mjs && python3 tests/regimen.py"""
import copy, functools, http.server, json, sys, tempfile, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "dist" / "site"
BUILTIN = json.loads((ROOT / "src" / "regimen.json").read_text())
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{httpd.server_address[1]}/"
TMP = Path(tempfile.mkdtemp())
fails, errs = [], []


def check(name, ok, detail=""):
    print(("OK  " if ok else "FAIL"), name, detail)
    if not ok:
        fails.append(name)


def write(name, obj):
    f = TMP / name
    f.write_text(obj if isinstance(obj, str) else json.dumps(obj))
    return str(f)


mine = copy.deepcopy(BUILTIN)
mine["name"] = "Test plan"
mine["windows"][0][1] = "Sunrise block"
mine["items"].insert(0, [0, "Test item alpha", "A"])
mine["notes"] = [["t1", "Today", ["First test note"]]]
bad = copy.deepcopy(BUILTIN)
bad["items"][0][1] = "<img src=x onerror=alert(1)>"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    ctx.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','p')")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator("#hp " + s)
    text = lambda: pg.evaluate("document.getElementById('hp').shadowRoot.textContent")

    def settings():
        P("button[data-a=tab][data-v=more]").click(); pg.wait_for_timeout(300)
        if not P("button[data-a=rgs]").count():
            P("button[data-a=sec][data-v=settings]").click(); pg.wait_for_timeout(300)

    def today():
        P("button[data-a=tab][data-v=today]").click(); pg.wait_for_timeout(400)

    settings()
    check("regimen card shows the built-in regimen", "built into the app" in text() and BUILTIN.get("name", "") in text())
    with pg.expect_download(timeout=5000) as dl:
        P("button[data-a=rgs]").click()
    saved = json.loads(Path(dl.value.path()).read_text())
    check("save regimen file matches the built-in one", saved == BUILTIN and dl.value.suggested_filename == "daily-regimen.json")

    P("#rgf").set_input_files(write("builtin.json", BUILTIN)); pg.wait_for_timeout(400)
    check("the built-in regimen file passes the checks", P("button[data-a=rgy]").count() == 1, text()[-200:] if not P("button[data-a=rgy]").count() else "")
    P("button[data-a=rgn]").click(); pg.wait_for_timeout(300)
    P("#rgf").set_input_files(write("bad.json", bad)); pg.wait_for_timeout(400)
    check("file with markup is refused", "Not loaded" in text() and not P("button[data-a=rgy]").count())
    P("#rgf").set_input_files(write("junk.json", "{not json")); pg.wait_for_timeout(400)
    check("non-JSON file is refused", "not valid JSON" in text())

    P("#rgf").set_input_files(write("mine.json", mine)); pg.wait_for_timeout(400)
    check("asks before replacing", P("button[data-a=rgy]").count() == 1 and "Test plan" in text())
    P("button[data-a=rgy]").click(); pg.wait_for_timeout(500)
    check("regimen card shows the loaded file", "loaded from a file" in text() and f"{len(mine['items'])} items" in text())
    check("version notes come from the file", "First test note" in text() or P("summary:text-is('t1 (Today)')").count() == 1)
    today()
    check("loaded windows show on Today", "Sunrise block" in text())
    pg.reload(); pg.wait_for_timeout(1500)
    check("loaded regimen survives reload", "Sunrise block" in text())

    P("button[data-a=tab][data-v=more]").click(); pg.wait_for_timeout(300)
    P("button[data-a=sec][data-v=reports]").click(); pg.wait_for_timeout(300)
    with pg.expect_download(timeout=5000) as dl:
        P("button[data-a=bk]").click()
    backup = json.loads(Path(dl.value.path()).read_text())
    check("backup carries the loaded regimen", backup.get("reg", {}).get("name") == "Test plan")

    # a fresh device: restore that backup from the file
    pg2 = ctx.new_page(); pg2.on("pageerror", lambda e: errs.append(str(e)[:200]))
    ctx2 = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    ctx2.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','p')")
    q = ctx2.new_page(); q.on("pageerror", lambda e: errs.append(str(e)[:200]))
    q.goto(BASE); q.wait_for_timeout(1500)
    Q = lambda s: q.locator("#hp " + s)
    qtext = lambda: q.evaluate("document.getElementById('hp').shadowRoot.textContent")
    check("fresh device starts on the built-in regimen", "Sunrise block" not in qtext())
    Q("button[data-a=tab][data-v=more]").click(); q.wait_for_timeout(300)
    Q("button[data-a=sec][data-v=reports]").click(); q.wait_for_timeout(300)
    Q("#rsfi").set_input_files(write("mine.json", mine)); q.wait_for_timeout(400)
    check("regimen file is not taken as a backup", not Q("button[data-a=rsy]").count())
    Q("#rsfi").set_input_files(write("backup.json", backup)); q.wait_for_timeout(400)
    Q("button[data-a=rsy]").click(); q.wait_for_timeout(600)
    Q("button[data-a=tab][data-v=today]").click(); q.wait_for_timeout(400)
    check("restoring a backup file brings the regimen", "Sunrise block" in qtext())
    ctx2.close()
    pg2.close()

    # a backup of the built-in regimen does not pin it
    settings()
    P("button[data-a=rgb]").click(); pg.wait_for_timeout(300)
    check("switching back asks first", "Tap again" in text())
    P("button[data-a=rgb]").click(); pg.wait_for_timeout(400)
    today()
    check("back on the built-in regimen", "Sunrise block" not in text())
    stored = pg.evaluate("IDB.all().then(a => 'reg' in a)")
    check("built-in regimen is not stored", stored is False)
    b.close()
check("no page errors", not errs, errs)
httpd.shutdown()
sys.exit(1 if fails else 0)
