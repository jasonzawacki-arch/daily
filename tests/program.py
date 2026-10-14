"""Lifting program files in the installable app (dist/site): save the program, load another one (with Undo),
refuse a bad file, and take a program carried inside a regimen file.
Run: node build.mjs && python3 tests/program.py"""
import copy, functools, http.server, json, sys, tempfile, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "dist" / "site"
REG = json.loads((ROOT / "src" / "regimen.json").read_text())
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
    f.write_text(json.dumps(obj))
    return str(f)


UL = {"format": "daily-program", "version": 1, "name": "Upper lower", "days": [
    {"n": "Upper A", "ex": [{"n": "Bench press", "s": 3, "r": "6-8"}, {"n": "Barbell row", "s": 3, "r": "8-10", "t": "Pause at chest"}]},
    {"n": "Lower A", "ex": [{"n": "Back squat", "s": 3, "r": "5"}]},
    {"n": "Rest", "off": True, "ex": []}]}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True, is_mobile=True, has_touch=True)
    ctx.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','l')")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1500)
    L = lambda s: pg.locator("#hl " + s)
    ltext = lambda: pg.evaluate("document.getElementById('hl').shadowRoot.textContent")
    L("button[data-a=tab][data-v=prog]").tap(); pg.wait_for_timeout(400)
    before = pg.evaluate("JSON.stringify(L_.mem().prog)")

    with pg.expect_download(timeout=5000) as dl:
        L("button[data-a=pgs]").tap()
    saved = json.loads(Path(dl.value.path()).read_text())
    check("save program file", saved.get("format") == "daily-program" and len(saved["days"]) == len(json.loads(before)["days"]), dl.value.suggested_filename)

    with pg.expect_file_chooser(timeout=4000) as fc:
        L("label[for=pgf]").tap()
    fc.value.set_files(write("saved.json", saved)); pg.wait_for_timeout(500)
    check("the saved file loads back (passes the checks)", L("#ut button[data-pa]").count() == 1, L("#ut").inner_text())

    bad = copy.deepcopy(UL); bad["days"][0]["ex"][0]["s"] = 0
    L("#pgf").set_input_files(write("bad.json", bad)); pg.wait_for_timeout(500)
    check("bad program is refused", "Program not loaded" in L("#ut").inner_text() and not L("#ut button[data-pa]").count(), L("#ut").inner_text())
    bad2 = copy.deepcopy(UL); bad2["days"][0]["n"] = "<b>x</b>"
    L("#pgf").set_input_files(write("bad2.json", bad2)); pg.wait_for_timeout(500)
    check("markup is refused", "Program not loaded" in L("#ut").inner_text())

    L("#pgf").set_input_files(write("ul.json", UL)); pg.wait_for_timeout(500)
    check("offers Replace with a summary", "Upper lower (2 training days)" in L("#ut").inner_text())
    L("#ut button[data-pa]").tap(); pg.wait_for_timeout(500)
    t = ltext()
    check("program replaced", "Upper lower" in t and pg.evaluate("L_.mem().prog.days.length") == 3)
    check("rest day kept", pg.evaluate("L_.mem().prog.days[2].off === true"))
    check("Undo offered", "Program replaced" in L("#ut").inner_text())
    L("#ut button").tap(); pg.wait_for_timeout(500)
    check("Undo restores the previous program", pg.evaluate("JSON.stringify(L_.mem().prog)") == before)

    # a regimen file that carries a program
    reg = copy.deepcopy(REG); reg["name"] = "With program"; reg["program"] = UL
    pg.evaluate("window.gomod('p')"); pg.wait_for_timeout(300)
    P = lambda s: pg.locator("#hp " + s)
    P("button[data-a=tab][data-v=more]").tap(); pg.wait_for_timeout(300)
    P("button[data-a=sec][data-v=settings]").tap(); pg.wait_for_timeout(300)
    P("#rgf").set_input_files(write("reg.json", reg)); pg.wait_for_timeout(500)
    check("regimen offer mentions the program", "lifting program" in P("#ut").inner_text(), P("#ut").inner_text())
    P("#ut button").tap(); pg.wait_for_timeout(600)
    check("regimen Replace also sets the program", pg.evaluate("L_.mem().prog.name") == "Upper lower")
    # a regimen file can also be picked on the Program tab
    pg.evaluate("window.gomod('l')"); pg.wait_for_timeout(300)
    reg["program"] = dict(UL, name="From regimen")
    L("#pgf").set_input_files(write("reg2.json", reg)); pg.wait_for_timeout(500)
    check("Program tab takes the program out of a regimen file", "From regimen" in L("#ut").inner_text())
    pg.reload(); pg.wait_for_timeout(1500)
    check("program survives reload", pg.evaluate("L_.mem().prog.name") == "Upper lower")

    # templates: each one saves as a valid file, and using one replaces the program
    L("button[data-a=tab][data-v=prog]").tap(); pg.wait_for_timeout(400)
    names = L("#tpl option").all_inner_texts()
    check("templates offered", all(n in names for n in ["Dorian Yates HIT", "Push pull legs", "PHUL", "PHAT", "Upper lower", "Full body 3 days", "5x5 strength"]), names)
    for i, n in enumerate(names):
        L("#tpl").select_option(str(i)); pg.wait_for_timeout(250)
        with pg.expect_download(timeout=5000) as dl:
            L("button[data-a=tps]").tap()
        f = json.loads(Path(dl.value.path()).read_text())
        L("#pgf").set_input_files(write(f"t{i}.json", f)); pg.wait_for_timeout(400)
        check(f"template file is valid: {n}", f["name"] == n and L("#ut button[data-pa]").count() == 1, L("#ut").inner_text())
    L("#tpl").select_option(str(names.index("PHUL"))); pg.wait_for_timeout(250)
    L("button[data-a=tpu]").tap(); pg.wait_for_timeout(500)
    check("PHUL uses fixed weekdays", pg.evaluate("L_.mem().prog.sched") == "week" and pg.evaluate("L_.mem().prog.days.length") == 7)
    wd = pg.evaluate("(new Date().getDay() + 6) % 7")
    day = pg.evaluate(f"L_.mem().prog.days[{wd}]")
    kind = pg.evaluate("L_.kind(new Date(Date.now() - new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10))")
    check("today follows the weekday", kind == ("R" if day.get("off") else "L"), (wd, day["n"], kind))
    check("week labels on the day picker", L(".sg button").count() == 7 and L(".sg button").first.inner_text() == "Mon")
    L("button[data-a=tab][data-v=today]").tap(); pg.wait_for_timeout(300)
    hdr = L("header .dt b").inner_text()
    check("Today shows today's PHUL day", hdr == (day["n"] if not day.get("off") else "Recovery day") or (day.get("off") and hdr == "Rest"), hdr)
    L("button[data-a=tab][data-v=prog]").tap(); pg.wait_for_timeout(300)
    # move Monday's workout to Wednesday: Monday down twice (Mon <-> Tue swap is not wanted, so use rest toggles too)
    L("button[data-a=dmd][data-v='0']").tap(); pg.wait_for_timeout(300)
    check("move day down swaps days", pg.evaluate("L_.mem().prog.days[1].n") == "Upper power" and pg.evaluate("L_.mem().prog.days[0].n") == "Lower power")
    L("button[data-a=doff][data-v='2']").tap(); pg.wait_for_timeout(300)
    check("rest day becomes a training day", pg.evaluate("!L_.mem().prog.days[2].off"))
    L("button[data-a=doff][data-v='2']").tap(); pg.wait_for_timeout(300)
    check("and back to a rest day", pg.evaluate("L_.mem().prog.days[2].off === true"))
    L("#sch").select_option("cycle"); pg.wait_for_timeout(300)
    check("switch to rotating cycle", pg.evaluate("L_.mem().prog.sched") is None and L(".sg button").count() == 7)
    L("button[data-a=ad][data-v=off]").tap(); pg.wait_for_timeout(300)
    check("add rest day", pg.evaluate("L_.mem().prog.days.length") == 8 and pg.evaluate("L_.mem().prog.days[7].off === true"))
    L("#sch").select_option("week"); pg.wait_for_timeout(300)
    check("8 days cannot become a week", pg.evaluate("L_.mem().prog.sched") is None and "A week has 7 days" in ltext())
    L("button[data-a=rmd]").tap(); pg.wait_for_timeout(300)
    L("#sch").select_option("week"); pg.wait_for_timeout(300)
    check("7 days can", pg.evaluate("L_.mem().prog.sched") == "week")
    L("#tpl").select_option("0"); pg.wait_for_timeout(250)
    L("button[data-a=tpu]").tap(); pg.wait_for_timeout(400)
    L("#sch").select_option("week"); pg.wait_for_timeout(300)
    check("a 6-day cycle pads to a week with rest days", pg.evaluate("L_.mem().prog.days.length") == 7 and pg.evaluate("L_.mem().prog.days[6].off === true"))
    b.close()
check("no page errors", not errs, errs)
httpd.shutdown()
sys.exit(1 if fails else 0)
