"""Supplies: the run-out and reorder math, then the screens in a phone-sized browser. Adding stores and supplies,
reorder dates that allow for delivery time, the line on Today, the reorder plan, receiving an order, subscriptions
that build up stock, checking off an item using stock and opening a sealed container, reading a label photo through
a mocked AI provider, the sample label, and the AI key staying out of backups.
Run: node build.mjs && python3 tests/supply.py"""
import base64, json, os, subprocess, sys, tempfile
from datetime import date, timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
fails, errs = [], []


def check(name, ok, detail=""):
    print(("OK  " if ok else "FAIL"), name, "" if ok else str(detail)[:300])
    if not ok:
        fails.append(name)


# ---- the math, run straight from src/supply.ts ----
js = r"""
const ts = require('typescript'), fs = require('fs');
const src = ts.transpileModule(fs.readFileSync('src/supply.ts', 'utf8'), { compilerOptions: { module: 1, target: 7 } }).outputText;
const m = { exports: {} }; new Function('module', 'exports', 'require', src)(m, m.exports, require);
const S = m.exports, T = '2026-10-15', out = {};
out.basic = S.project({ n: 'a', c: 100, per: 500, s: 1 }, 5, T, 1);
out.now = S.project({ n: 'b', c: 4, per: 60 }, 2, T, 1);
out.unknown = S.project({ n: 'c', c: 4 }, 0, T, 0);
out.over = S.project({ n: 'd', c: 60, per: 120, sub: { every: 28, qty: 1, next: '2026-11-01' } }, 1, T, 0);
out.short = S.project({ n: 'e', c: 20, per: 30, sub: { every: 56, qty: 1, next: '2026-11-01' } }, 1, T, 0);
out.fits = S.project({ n: 'f', c: 20, per: 30, sub: { every: 28, qty: 1, next: '2026-11-01' } }, 1, T, 0);
out.cpdHist = S.checksPerDay([true, true, false, true, true, true, true], 7, 'A');
out.cpdSched = S.checksPerDay([true], 2, 'A');
out.label = S.cleanLabel({ brand: ' Now <b>', product: 'Fish Oil', unit: 'Softgels', amountPerContainer: '200', servingSize: 2, prescription: 'yes' });
out.json = S.firstJson('Here you go:\n```json\n{"brand":"X","product":"Y"}\n```');
console.log(JSON.stringify(out));
"""
r = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True)
if r.returncode:
    check("math module runs", False, r.stderr)
    sys.exit(1)
o = json.loads(r.stdout)
b = o["basic"]
check("on hand counts the open container and sealed ones", b["total"] == 600, b)
check("days left from daily use", b["daysLeft"] == 120 and b["runOut"] == "2027-02-12", b)
check("reorder date allows delivery time and the 7-day margin", b["reorderBy"] == "2027-02-04" and b["status"] == "ok", b)
check("almost out means order now", o["now"]["daysLeft"] == 2 and o["now"]["status"] == "now", o["now"])
check("no daily use: unknown, no made-up dates", o["unknown"]["status"] == "unknown" and o["unknown"]["runOut"] is None, o["unknown"])
ov = o["over"]["sub"]
check("subscription bringing more than you use is flagged with a better interval", ov["verdict"] == "over" and ov["suggestEvery"] == 119 and ov["extraPerYear"] > 9, ov)
sh = o["short"]
check("subscription that falls short finds the day it runs out", sh["sub"]["verdict"] == "short" and sh["runOut"] == "2026-12-04", sh)
check("subscription that keeps up", o["fits"]["sub"]["verdict"] == "fits" and o["fits"]["runOut"] is None and o["fits"]["status"] == "ok", o["fits"])
check("daily use from checklist history after a week", abs(o["cpdHist"] - 6 / 7) < 1e-9, o["cpdHist"])
check("daily use from the schedule before that", abs(o["cpdSched"] - 2 / 7) < 1e-9, o["cpdSched"])
L = o["label"]
check("label details are cleaned: markup stripped, numbers parsed, unclear prescription flag ignored",
      L["brand"] == "Now b" and L["per"] == 200 and L["unit"] == "softgels" and L["rx"] is False, L)
check("label JSON found inside a fenced reply", o["json"] == {"brand": "X", "product": "Y"}, o["json"])

# ---- the screens ----
path = (ROOT / "dist" / "daily.html").as_uri()
today = date.today()
png = Path(tempfile.mkdtemp()) / "label.png"
png.write_bytes(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="))

with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','p')")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(path)
    pg.wait_for_timeout(1200)
    P = lambda s, **kw: pg.locator("#hp " + s, **kw)
    W = lambda: pg.wait_for_timeout(250)

    def supplies():
        P("button[data-a=tab][data-v=more]").click(); W()
        if P("button[data-a=sec][data-v=supply][aria-expanded=false]").count():
            P("button[data-a=sec][data-v=supply]").click(); W()

    def add(name, **f):
        P("button[data-a=spn]").click(); W()
        P("#spn").fill(name)
        for k, v in f.items():
            el = P("#" + k)
            el.evaluate("e => { const d = e.closest('details'); if (d) d.open = true; }")
            if el.evaluate("e => e.tagName") == "SELECT":
                el.select_option(label=v) if not v.startswith("=") else el.select_option(v[1:])
            elif el.get_attribute("type") == "checkbox":
                el.check() if v else el.uncheck()
            else:
                el.fill(str(v))
        P("button[data-a=sps]").click(); W()

    def row(name):
        return P(".sp", has_text=name).first.inner_text()

    supplies()
    P("#stn").fill("Amazon Prime"); P("#std").fill("1"); P("button[data-a=sta]").click(); W()
    check("a store is added with its delivery time", "Amazon Prime" in P(".card", has_text="Stores").inner_text())

    add("Creatine", spu="g", spper="500", spc="100", sps="1", sppd="5", spst="Amazon Prime (1 day)")
    r1 = row("Creatine")
    exp = (today + timedelta(days=120 - 8))
    check("a supply shows stock, days left and its reorder date", "100 g open + 1 sealed" in r1 and "Lasts about 120 days" in r1 and exp.strftime("%b") in r1, r1)

    add("Fish oil", spu="softgels", spper="60", spc="4", sppd="2", spst="Amazon Prime (1 day)")
    check("an item nearly out says reorder now", "Reorder now" in row("Fish oil"), row("Fish oil"))
    plan_txt = P(".card", has_text="Reorder plan").inner_text()
    check("the reorder plan groups it under its store", "Amazon Prime" in plan_txt and "Fish oil" in plan_txt and "Creatine" not in plan_txt, plan_txt)

    add("Vitamin D3", spu="softgels", spper="120", spc="60", sppd="1", spsub=True, spev="4", spqty="1")
    v = row("Vitamin D3")
    check("a subscription that brings too much suggests a longer interval", "stock builds up" in v and "Try every 17 weeks" in v, v)

    # Today shows one line for what is due
    P("button[data-a=tab][data-v=today]").click(); W()
    al = P(".al", has_text="Reorder soon")
    check("Today shows one reorder line, only for what is due", al.count() == 1 and "Fish oil" in al.inner_text() and "Creatine" not in al.inner_text(), al.all_inner_texts())
    al.locator("button[data-a=spgo]").click(); W()
    check("the line opens Supplies", P("button[data-a=spn]").count() == 1)
    P(".card", has_text="Reorder plan").locator("button[data-a=sprc]").first.click(); W()
    check("Received adds a sealed container", "4 softgels open + 1 sealed" in row("Fish oil"), row("Fish oil"))


    # validation keeps what was typed
    P("button[data-a=spn]").click(); W()
    P("#spn").fill("Zinc"); P("#spper").fill("90"); P("details", has_text="Subscription").locator("summary").click(); P("#spsub").check(); P("#spper").fill(""); P("button[data-a=sps]").click(); W()
    check("a problem is explained and the typed name stays", "amount per container" in P(".spm").inner_text() and P("#spn").input_value() == "Zinc")
    P("button[data-a=spcx]").click(); W()

    # sample label without a key
    P("button[data-a=spn]").click(); W()
    P("button[data-a=aismp]").first.click(); W()
    check("the sample label fills the form", P("#spn").input_value() == "Magnesium glycinate" and P("#spper").input_value() == "120" and P("#spu").input_value() == "capsules")
    P("button[data-a=spcx]").click(); W()

    # a label photo read through a mocked provider
    seen = []
    def claude(route):
        seen.append((route.request.headers.get("x-api-key"), json.loads(route.request.post_data)))
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"content": [{"type": "text", "text": '{"brand":"Thorne","product":"Zinc picolinate","unit":"capsules","servingSize":1,"amountPerContainer":60,"prescription":false}'}]}))
    pg.route("https://api.anthropic.com/**", claude)
    P("button[data-a=spn]").click(); W()
    P("button[data-a=aitg]").first.click(); W()
    P("#aik").fill("sk-test-KEY123"); P("button[data-a=aisv]").click(); W()
    P("#splab").set_input_files(str(png)); pg.wait_for_timeout(800)
    check("a label photo fills the form", P("#spn").input_value() == "Zinc picolinate" and P("#spb").input_value() == "Thorne" and P("#spper").input_value() == "60", P(".spm").all_inner_texts())
    check("the photo goes to the chosen provider with the key, as a small JPEG", seen and seen[0][0] == "sk-test-KEY123" and seen[0][1]["messages"][0]["content"][0]["source"]["media_type"] == "image/jpeg", seen[:1])
    P("button[data-a=spcx]").click(); W()
    gathered = pg.evaluate("() => JSON.stringify(window.Cloud ? window.Cloud.gather() : {})")
    check("the AI key is not in backups or sync", "KEY123" not in gathered and "Creatine" in gathered, gathered[:120])

    def bad(route):
        route.fulfill(status=401, content_type="application/json", body="{}")
    pg.unroute("https://api.anthropic.com/**"); pg.route("https://api.anthropic.com/**", bad)
    P("button[data-a=spn]").click(); W()
    P("#splab").set_input_files(str(png)); pg.wait_for_timeout(800)
    check("a rejected key is explained", "did not accept the key" in P(".spm").inner_text(), P(".spm").all_inner_texts())
    P("button[data-a=spcx]").click(); W()

    # checking off a linked item uses stock and opens a sealed container
    P(".sp", has_text="Creatine").locator("button[data-a=spe]").click(); W()
    P("#spk").select_option(label="Creatine 5 g"); P("#spq").fill("5"); P("#spc").fill("3"); P("#sppd").fill("")
    P("button[data-a=sps]").click(); W()
    P("button[data-a=tab][data-v=today]").click(); W()
    P("#qc-today").fill("took creatine"); P("#qc-today").press("Enter"); W()
    P("button[data-a=vsave]").click(); pg.wait_for_timeout(400)
    supplies()
    check("checking off uses stock and opens a sealed container when the open one runs out", "498 g open" in row("Creatine") and "sealed" not in row("Creatine").split("\n")[1], row("Creatine"))

    if os.environ.get("SHOT"):
        P("button[data-a=sec][data-v=supply]").scroll_into_view_if_needed()
        pg.screenshot(path=os.environ["SHOT"] + "/sup-list.png", full_page=True)
        P(".sp", has_text="Fish oil").locator("button[data-a=spe]").click(); W()
        P(".spf").screenshot(path=os.environ["SHOT"] + "/sup-form.png")
        P("button[data-a=spcx]").click(); W()
        P("button[data-a=tab][data-v=today]").click(); W()
        pg.screenshot(path=os.environ["SHOT"] + "/sup-today.png")
        supplies()
    # phone width
    over = pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check("no sideways scroll on the Supplies screen", over <= 0, over)
    br.close()

check("no script errors", not errs, errs)
print(f"\n{len(fails)} failed" if fails else "\nall supply checks passed")
sys.exit(1 if fails else 0)
