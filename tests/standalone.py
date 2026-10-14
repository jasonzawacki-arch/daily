"""The installable phone app (dist/site served as plain files, as GitHub Pages does): runs without Claude,
saves data on the device, downloads backups as files, explains cloud backup, and works offline.
Run: node build.mjs && python3 tests/standalone.py"""
import functools, http.server, json, os, sys, threading
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


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True, service_workers="allow")
    ctx.add_init_script("localStorage.setItem('tour','1')")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator("#hp " + s)
    check("runs without Claude", pg.evaluate("window.DAILY_STANDALONE === true"))
    check("opens on Lift the first time", pg.evaluate("document.getElementById('hl').style.display !== 'none' && document.getElementById('hp').style.display === 'none'"))
    seen = pg.evaluate("document.getElementById('hp').shadowRoot.textContent + document.getElementById('hl').shadowRoot.textContent").lower()
    check("sample regimen has no medication items", not any(w in seen for w in ("peptide", "subq", "injection")))
    pg.evaluate("window.gomod('p')"); pg.wait_for_timeout(300)
    m = pg.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
    check("installable manifest", m["display"] == "standalone" and m["start_url"] == "./" and len(m["icons"]) == 3)
    # check an item, reload, still checked
    P("label.r input[type=checkbox]").first.check(); pg.wait_for_timeout(600)
    done = P(".pg b").inner_text()
    pg.reload(); pg.wait_for_timeout(1500)
    check("data kept on the device across reload", P(".pg b").inner_text() == done, done)
    # backup downloads as a file
    P("button[data-a=tab][data-v=more]").click(); pg.wait_for_timeout(500)
    P("button[data-a=sec][data-v=reports]").click(); pg.wait_for_timeout(400)
    check("cloud backup explains itself", "inside Claude" in pg.content())
    try:
        with pg.expect_download(timeout=5000) as dl:
            P("button[data-a=bk]").click()
        data = json.loads(Path(dl.value.path()).read_text())
        check("backup downloads as a file", dl.value.suggested_filename == "daily-backup.json" and isinstance(data, dict), dl.value.suggested_filename)
    except Exception as e:
        check("backup downloads as a file", False, str(e)[:120])
    # offline
    pg.evaluate("navigator.serviceWorker.ready"); pg.wait_for_timeout(500)
    if not pg.evaluate("!!navigator.serviceWorker.controller"):
        pg.reload(); pg.wait_for_timeout(1200)
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(1500)
    check("works offline", P(".pg b").count() == 1 and P(".pg b").inner_text() == done)
    ctx.set_offline(False)
    b.close()
check("no page errors", not errs, errs)
httpd.shutdown()
sys.exit(1 if fails else 0)
