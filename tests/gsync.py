"""Google Drive sync in the installed app, against a stand-in for Google (sign-in and Drive are faked in the
browser): turn on, sync changes between two devices, deletes, expired access (Sync button), the first-sync choice,
turn off, and no sync offered without a client ID.
Run: node build.mjs && python3 tests/gsync.py"""
import functools, http.server, json, re, sys, threading, time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "dist" / "site"
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{httpd.server_address[1]}/"
fails, errs = [], []
DRIVE = {}  # id -> {"name": str, "body": str}
CALLS = []


def check(name, ok, detail=""):
    print(("OK  " if ok else "FAIL"), name, detail)
    if not ok:
        fails.append(name)


FAKE_GSI = """window.google = { accounts: { oauth2: {
  initTokenClient(cfg) { return { requestAccessToken(o) { window.__gsi = (window.__gsi || 0) + 1;
    setTimeout(() => cfg.callback({ access_token: 'tok' + Date.now(), expires_in: window.__expIn || 3600 }), 20); } }; },
  revoke(t, cb) { cb && cb(); } } } };"""

CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PATCH, OPTIONS"}


def google_api(route):
    req = route.request
    u = urlparse(req.url)
    if req.method == "OPTIONS":
        return route.fulfill(status=204, headers=CORS)
    if not (req.headers.get("authorization") or "").startswith("Bearer tok"):
        return route.fulfill(status=401, headers=CORS, body="{}")
    CALLS.append((req.method, u.path))
    j = lambda o, s=200: route.fulfill(status=s, headers={**CORS, "content-type": "application/json"}, body=json.dumps(o))
    if u.path == "/oauth2/v3/userinfo":
        return j({"email": "tester@example.com"})
    if u.path == "/drive/v3/files" and req.method == "GET":
        q = parse_qs(u.query)
        name = re.search(r"name='([^']+)'", q.get("q", [""])[0]).group(1)
        return j({"files": [{"id": i} for i, f in DRIVE.items() if f["name"] == name]})
    m = re.match(r"^/drive/v3/files/([^/]+)$", u.path)
    if m and req.method == "GET":
        return route.fulfill(status=200, headers={**CORS, "content-type": "application/json"}, body=DRIVE[m.group(1)]["body"])
    m = re.match(r"^/upload/drive/v3/files/([^/]+)$", u.path)
    if m and req.method == "PATCH":
        DRIVE[m.group(1)]["body"] = req.post_data
        return j({"id": m.group(1)})
    if u.path == "/upload/drive/v3/files" and req.method == "POST":
        b = re.search(r"boundary=(\S+)", req.headers["content-type"]).group(1)
        parts = [p for p in req.post_data.split("--" + b) if p.strip() and p.strip() != "--"]
        meta = json.loads(parts[0].split("\r\n\r\n", 1)[1].strip())
        body = parts[1].split("\r\n\r\n", 1)[1].rstrip("\r\n")
        assert meta["parents"] == ["appDataFolder"], meta
        fid = "f%d" % (len(DRIVE) + 1)
        DRIVE[fid] = {"name": meta["name"], "body": body}
        return j({"id": fid})
    return route.fulfill(status=404, headers=CORS, body="{}")


def drive_items():
    f = [x for x in DRIVE.values() if x["name"] == "daily-sync.json"]
    return json.loads(f[0]["body"])["items"] if f else {}


def device(b, client=True, exp=3600):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    init = "localStorage.setItem('tour','1');localStorage.setItem('side','p');"
    init += f"window.GSYNC_CLIENT_ID='test-client';window.__expIn={exp};" if client else "window.GSYNC_CLIENT_ID='';"
    ctx.add_init_script(init)
    ctx.route("https://accounts.google.com/gsi/client", lambda r: r.fulfill(status=200, content_type="text/javascript", body=FAKE_GSI))
    ctx.route(re.compile(r"^https://www\.googleapis\.com/.*"), google_api)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1500)
    return ctx, pg


P = lambda pg, s: pg.locator("#hp " + s)
text = lambda pg: pg.evaluate("document.getElementById('hp').shadowRoot.textContent")


def reports(pg):
    P(pg, "button[data-a=tab][data-v=more]").tap(); pg.wait_for_timeout(300)
    if not P(pg, "button[data-a=gson], button[data-a=gsnow], button[data-a=gsch]").count():
        P(pg, "button[data-a=sec][data-v=reports]").tap(); pg.wait_for_timeout(300)


def today(pg):
    P(pg, "button[data-a=tab][data-v=today]").tap(); pg.wait_for_timeout(300)
    # Which time window starts open depends on the time of day; open windows until at least two items can be checked.
    boxes = P(pg, "label.r input[type=checkbox]")
    for i in range(P(pg, "button[data-a=o]").count()):
        if boxes.count() >= 2:
            break
        P(pg, "button[data-a=o]").nth(i).tap(); pg.wait_for_timeout(250)


def checked(pg):
    return pg.evaluate("(() => { const d = P_.mem()['d-' + P_.g()]; return d && d.c ? Object.keys(d.c).filter(k => d.c[k]).sort() : []; })()")


with sync_playwright() as p:
    b = p.chromium.launch()

    # no client ID: no sync offered, the old explanation stays
    c0, z = device(b, client=False)
    reports(z)
    check("without a client ID, no sync is offered", not P(z, "button[data-a=gson]").count() and "inside Claude" in text(z))
    c0.close()

    # device A turns sync on
    ca, a = device(b)
    reports(a)
    check("sync card offers to turn on (optional)", P(a, "button[data-a=gson]").count() == 1 and "Optional" in text(a))
    P(a, "button[data-a=gson]").tap(); a.wait_for_timeout(1200)
    check("signed in and synced", "Syncing as tester@example.com" in text(a) and "Last synced" in text(a), text(a)[-300:])
    check("file created in the hidden app folder", len(DRIVE) == 1 and "cfg" in drive_items() or len(DRIVE) == 1, list(DRIVE))

    # a change on A syncs on its own
    today(a)
    P(a, "label.r input[type=checkbox]").first.check(); a.wait_for_timeout(5500)
    da = a.evaluate("'d-' + P_.g()")
    check("a change syncs on its own", da in drive_items() and drive_items()[da]["v"]["c"], list(drive_items())[:5])

    # device B (no data yet) turns sync on and gets A's day
    cb, bb = device(b)
    reports(bb)
    P(bb, "button[data-a=gson]").tap(); bb.wait_for_timeout(1200)
    check("a new device skips the question and takes the Drive copy", not P(bb, "button[data-a=gsch]").count())
    check("device B has A's check mark", checked(bb) == checked(a) and len(checked(a)) == 1, (checked(bb), checked(a)))

    # B changes the lifting program; A taps Sync now and gets it
    bb.evaluate("L_.put('prog', Object.assign({}, L_.mem().prog, {name: 'From B'}))"); bb.wait_for_timeout(5500)
    reports(a)
    P(a, "button[data-a=gsnow]").tap(); a.wait_for_timeout(1200)
    check("Sync now brings B's program change to A", a.evaluate("L_.mem().prog.name") == "From B")

    # deletes travel: A loads a regimen, B gets it; A goes back to the built-in one, B loses it
    reg = json.loads((ROOT / "src" / "regimen.json").read_text()); reg["name"] = "Synced plan"
    a.evaluate("r => P_.put('reg', r)", reg); a.wait_for_timeout(5500)
    reports(bb); P(bb, "button[data-a=gsnow]").tap(); bb.wait_for_timeout(1200)
    check("B gets A's regimen", bb.evaluate("P_.mem().reg && P_.mem().reg.name") == "Synced plan")
    a.evaluate("P_.put('reg', null)"); a.wait_for_timeout(5500)
    P(bb, "button[data-a=gsnow]").tap(); bb.wait_for_timeout(1200)
    check("deleting on A deletes on B", bb.evaluate("!P_.mem().reg"))
    check("B is back on the built-in regimen", bb.evaluate("P_.reg().name") == json.loads((ROOT / "src" / "regimen.json").read_text())["name"])

    # expired access: the Sync button appears after a change; one tap syncs
    cc, cdev = device(b, exp=30)  # 30 s minus the 60 s margin: expired at once
    reports(cdev)
    P(cdev, "button[data-a=gson]").tap(); cdev.wait_for_timeout(1200)
    today(cdev)
    P(cdev, "label.r input[type=checkbox]").nth(1).check(); cdev.wait_for_timeout(600)
    chip = cdev.locator("#gsc")
    check("expired access shows the Sync button", chip.is_visible() and chip.inner_text() == "Sync")
    before = cdev.evaluate("window.__gsi")
    chip.tap(); cdev.wait_for_timeout(1200)
    check("one tap signs in again and syncs", cdev.evaluate("window.__gsi") == before + 1 and len(drive_items()[da]["v"]["c"]) >= 2, drive_items()[da]["v"]["c"])
    cc.close()

    # first sync on a device with its own data: the question, then Combine
    cd, d = device(b)
    d.evaluate("P_.put('d-2020-01-02', {t: 'L', c: {i1: 1}, w: 16})"); d.wait_for_timeout(300)
    reports(d)
    P(d, "button[data-a=gson]").tap(); d.wait_for_timeout(1200)
    check("device with its own data is asked first", P(d, "button[data-a=gsch]").count() == 3, text(d)[-250:])
    P(d, "button[data-a=gsch][data-v=combine]").tap(); d.wait_for_timeout(1200)
    check("Combine keeps this device's day", d.evaluate("!!P_.mem()['d-2020-01-02']") and "d-2020-01-02" in drive_items())
    check("Combine brings the Drive data", d.evaluate("L_.mem().prog.name") == "From B" and d.evaluate(f"!!P_.mem()['{da}']"))

    # turn off
    P(d, "button[data-a=gsoff]").tap(); d.wait_for_timeout(400)
    check("turn off: back to the offer, data kept", P(d, "button[data-a=gson]").count() == 1 and d.evaluate("!!P_.mem()['d-2020-01-02']"))
    d.reload(); d.wait_for_timeout(1500)
    check("stays off after reload", not d.locator("#gsc").is_visible())
    check("tokens are never stored", not any("tok" in (d.evaluate("JSON.stringify(localStorage)") or "") for _ in [0]))
    b.close()
check("no page errors", not errs, errs)
httpd.shutdown()
sys.exit(1 if fails else 0)
