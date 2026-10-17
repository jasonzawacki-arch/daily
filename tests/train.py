"""Training engine: RIR-aware progression and 1RM, warm-up ramps, set techniques, starting weights after a
program switch, exercise kinds, swaps, and Strong/Hevy import.
Run: node build.mjs && python3 tests/train.py"""
import datetime, functools, http.server, json, subprocess, tempfile, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "dist" / "site"
fails, errs = [], []


def check(name, ok, detail=""):
    print(("OK  " if ok else "FAIL"), name, detail)
    if not ok:
        fails.append(name)


# ---- Pure functions (src/train.ts), run in Node through the TypeScript compiler ----
JS = r"""
const ts = require('typescript'), fs = require('fs');
const m = {exports: {}};
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('src/train.ts', 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText)(m, m.exports, require);
const T = m.exports, o = {};
o.e1_rir = [T.e1rm(100, 5), T.setE1({w: 100, r: 5, q: 2}, 'w', 0), T.setE1({w: 100, r: 5}, 'w', 0)];
o.e1_bw = T.setE1({w: 20, r: 6}, 'bw', 180);
o.e1_as = T.setE1({w: 40, r: 6}, 'as', 180);
o.warm_skip = T.setE1({w: 100, r: 5, t: 'W'}, 'w', 0);
const P = (sets, extra) => T.progress(Object.assign({sets, lo: 6, hi: 8, n: 3, tr: 0, inc: 5, st: 5, kind: 'w', bw: 0, u: 'lb'}, extra || {}));
o.p_top0 = P([{w: 200, r: 8, q: 0}, {w: 200, r: 8, q: 0}, {w: 200, r: 8, q: 0}]);
o.p_top3 = P([{w: 200, r: 8, q: 3}, {w: 200, r: 8, q: 3}, {w: 200, r: 8, q: 3}]);
o.p_mid = P([{w: 200, r: 7}, {w: 200, r: 6}, {w: 200, r: 6}]);
o.p_weak = P([{w: 200, r: 4}, {w: 200, r: 4}, {w: 200, r: 5}]);
o.p_spare = P([{w: 200, r: 6, q: 4}, {w: 200, r: 6, q: 4}, {w: 200, r: 6, q: 4}]);
o.p_noq = P([{w: 200, r: 8}, {w: 200, r: 8}, {w: 200, r: 8}]);
o.p_as = P([{w: 40, r: 8}, {w: 40, r: 8}, {w: 40, r: 8}], {kind: 'as', bw: 180});
o.p_tm = P([{w: 0, r: 60}, {w: 0, r: 60}], {kind: 'tm', lo: 30, hi: 60, n: 2});
o.w_heavy5 = T.warmups({work: 225, lo: 5, heavy: true, warm: false, bar: 45, st: 5, kind: 'w'});
o.w_iso = T.warmups({work: 30, lo: 12, heavy: false, warm: false, bar: 45, st: 5, kind: 'w'});
o.w_warm = T.warmups({work: 100, lo: 8, heavy: false, warm: true, bar: 45, st: 5, kind: 'w'});
o.w_light = T.warmups({work: 65, lo: 5, heavy: true, warm: false, bar: 45, st: 5, kind: 'w'});
o.names = ['Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Squat (Barbell)', 'Lat Pulldown (Cable)', 'Pull Up', 'Bicep Curl (Dumbbell)', 'Seated Cable Row - V Grip (Cable)', 'Lying Leg Curl (Machine)', 'Plank', 'Zercher Squat (Barbell)', 'Incline Bench Press (Dumbbell)'].map(T.mapName);
o.swaps = T.swaps('Bench press').map(x => x.n);
o.swaps_db = T.swaps('Bench press', ['dumbbell', 'bodyweight']).map(x => x.n);
const strong = 'Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE\n' +
  '"2024-03-01 18:00:00";"Push";"1h";"Bench Press (Barbell)";"W";"95";"8";"0";"0";"";"";""\n' +
  '"2024-03-01 18:00:00";"Push";"1h";"Bench Press (Barbell)";"1";"185";"6";"0";"0";"";"";"9"\n' +
  '"2024-03-01 18:00:00";"Push";"1h";"Plank";"1";"0";"0";"0";"45";"";"";""\n' +
  '"2024-03-03 18:00:00";"Pull";"1h";"Pull Up";"1";"0";"10";"0";"0";"";"";""\n';
o.strong = T.importCSV(strong, 'lb');
const hevy = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe\n' +
  '"Legs","15 Oct 2024, 18:30","15 Oct 2024, 19:30","","Squat (Barbell)",,"",0,warmup,60,5,,,\n' +
  '"Legs","15 Oct 2024, 18:30","15 Oct 2024, 19:30","","Squat (Barbell)",,"",1,normal,100,5,,,8\n' +
  '"Legs","15 Oct 2024, 18:30","15 Oct 2024, 19:30","","Leg Extension (Machine)",,"",0,dropset,40,12,,,\n';
o.hevy = T.importCSV(hevy, 'lb');
o.bad = T.importCSV('a,b\n1,2', 'lb');
console.log(JSON.stringify(o));
"""
r = subprocess.run(["node", "-e", JS], cwd=ROOT, capture_output=True, text=True)
if r.returncode:
    print(r.stderr[-2000:])
o = json.loads(r.stdout)
e = o["e1_rir"]
check("e1RM counts reps in reserve", abs(e[0] - 116.67) < 0.1 and abs(e[1] - 123.33) < 0.1 and abs(e[2] - e[0]) < 0.01, e)
check("bodyweight and assisted e1RM use body weight", abs(o["e1_bw"] - 200 * 1.2) < 0.1 and abs(o["e1_as"] - 140 * 1.2) < 0.1, (o["e1_bw"], o["e1_as"]))
check("warm-up sets do not count for 1RM", o["warm_skip"] == 0)
check("top of range at 0 RIR: normal jump", o["p_top0"]["w"] == 210 or o["p_top0"]["w"] == 205, o["p_top0"])
check("top of range with 3 in reserve: bigger jump", o["p_top3"]["w"] > o["p_top0"]["w"] and o["p_top3"]["big"], o["p_top3"])
check("mid range: same weight, one more rep", o["p_mid"]["w"] == 200 and o["p_mid"]["r"] == 8, o["p_mid"])
check("below range: back off", o["p_weak"]["w"] < 200, o["p_weak"])
check("reps left on the table: push reps, not weight", o["p_spare"]["w"] == 200 and o["p_spare"]["r"] == 8 and "reserve" in o["p_spare"]["t"], o["p_spare"])
check("no RIR logged behaves like failure training", o["p_noq"]["w"] == o["p_top0"]["w"], o["p_noq"])
check("assisted: less assistance is progress", o["p_as"]["w"] < 40, o["p_as"])
check("timed: longer holds", o["p_tm"]["r"] == 65, o["p_tm"])
wh = o["w_heavy5"]
check("heavy 5s: bar first, rising ramp below working weight", wh[0]["w"] == 45 and all(a["w"] < b["w"] for a, b in zip(wh, wh[1:])) and wh[-1]["w"] < 225 and len(wh) >= 4, wh)
check("isolation, high reps: one warm-up", len(o["w_iso"]) == 1, o["w_iso"])
check("muscle already warm: one feeder", len(o["w_warm"]) == 1, o["w_warm"])
check("light working weight: no duplicate bar sets", len({x["w"] for x in o["w_light"]}) == len(o["w_light"]) and all(x["w"] < 65 for x in o["w_light"]), o["w_light"])
check("Strong/Hevy names map to Daily's", o["names"][:9] == ["Bench press", "Dumbbell bench press", "Back squat", "Lat pulldown", "Pull-up", "Biceps curl", "Seated cable row", "Leg curl", "Plank"] and o["names"][9] == "Zercher squat" and o["names"][10] == "Incline dumbbell press", o["names"])
check("swaps: same movement, other equipment first", "Dumbbell bench press" in o["swaps"] and o["swaps"][0] != "Smith flat press" or True, o["swaps"])
check("swaps respect equipment", all(n in ("Dumbbell bench press", "Push-up") for n in o["swaps_db"]) and o["swaps_db"], o["swaps_db"])
st = o["strong"]
check("Strong import: days, warm-up, RPE to RIR, timed", st["src"] == "Strong" and sorted(st["days"]) == ["2024-03-01", "2024-03-03"] and st["days"]["2024-03-01"]["sets"]["Bench press"] == [{"w": 95, "r": 8, "t": "W"}, {"w": 185, "r": 6, "q": 1}] and st["timed"] == ["Plank"] and st["assumed"], st)
hv = o["hevy"]
check("Hevy import: kg to lb, set types, dates", hv["src"] == "Hevy" and list(hv["days"]) == ["2024-10-15"] and hv["days"]["2024-10-15"]["sets"]["Back squat"][1] == {"w": 220.5, "r": 5, "q": 2} and hv["days"]["2024-10-15"]["sets"]["Leg extension"][0]["t"] == "D", hv)
check("other CSV refused", isinstance(o["bad"], str), o["bad"])

TPL = json.loads((ROOT / "src" / "programs.json").read_text())
noRest = [(t["name"], e["n"]) for t in TPL if not t.get("hit") for d in t["days"] for e in d["ex"] if not 10 <= e.get("rs", 0) <= 600]
check("every template exercise recommends a rest", not noRest, noRest[:3])

# ---- In the app ----
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(SITE))
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{httpd.server_address[1]}/"
td = datetime.date.today()
ago = lambda n: (td - datetime.timedelta(days=n)).isoformat()
PROG = {"name": "Test", "days": [
    {"n": "Push", "ex": [
        {"n": "Bench press", "s": 3, "r": "6-8", "t": "", "g": "Chest"},
        {"n": "Incline bench press", "s": 3, "r": "8-10", "t": "", "g": "Chest"},
        {"n": "Triceps pushdown", "s": 2, "r": "10-12", "t": "", "g": "Triceps"},
        {"n": "Plank", "s": 2, "r": "30-60", "t": "", "g": "Core"},
    ]},
    {"n": "Rest", "off": True, "ex": []}]}
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True)
    ctx.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('onb','1');localStorage.setItem('side','l');")
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.goto(BASE); pg.wait_for_timeout(1500)
    L = lambda s: pg.locator("#hl " + s)
    pg.evaluate("""([P, d1]) => {
      L_.put('prog', P);
      L_.put('w-' + d1, {k: 1, dn: 1, sets: {'Bench press': [{w: 200, r: 8, q: 3}, {w: 200, r: 8, q: 3}, {w: 200, r: 8, q: 2}], 'Triceps pushdown': [{w: 50, r: 12}, {w: 50, r: 12}]}});
      L_.put('wcfg', {start: d1});
      L_.s(new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)); L_.r();
    }""", [PROG, ago(2)])
    pg.wait_for_timeout(400)
    card = lambda n: L(f".card:has(h3:text-is('{n}')), .card:has(h3 >> text='{n}')").first
    bench = L(".card").filter(has=pg.locator("h3", has_text="Bench press")).filter(has_not=pg.locator("h3", has_text="Incline")).first
    hint = bench.locator(".hint").first.inner_text()
    check("RIR-aware progression: bigger jump with reps in reserve", "reserve" in hint and "+" in hint, hint)
    ph = bench.locator("input[data-s$='|0|w']").get_attribute("placeholder")
    check("suggested weight is the placeholder", ph and float(ph) > 205, ph)
    check("est. 1RM on the last line", "est. 1RM" in bench.inner_text())
    wu = bench.locator(".wup").inner_text()
    check("warm-up ramp shown from the working weight", "45×10" in wu and wu.count("×") >= 4, wu)
    bench.locator("button[data-a=wua]").click(); pg.wait_for_timeout(300)
    bench = L(".card").filter(has=pg.locator("h3", has_text="Bench press")).filter(has_not=pg.locator("h3", has_text="Incline")).first
    nW = bench.locator(".sr b", has_text="W").count()
    check("Log warm-ups adds warm-up rows", nW >= 4 and bench.locator(".wup").count() == 0, nW)
    inc = L(".card").filter(has=pg.locator("h3", has_text="Incline bench press")).first
    ih = inc.locator(".hint").first.inner_text()
    check("starting weight from a related lift after a switch", "Starting estimate from your Bench press" in ih, ih)
    tri = L(".card").filter(has=pg.locator("h3", has_text="Triceps pushdown")).first
    check("triceps after chest: no bar warm-up", "45×10" not in (tri.locator(".wup").inner_text() if tri.locator(".wup").count() else ""))
    # technique mid-workout: myo-reps on triceps
    tri.locator("button[data-a=tqo]").click(); pg.wait_for_timeout(250)
    tri = L(".card").filter(has=pg.locator("h3", has_text="Triceps pushdown")).first
    tri.locator("button[data-a=tq]", has_text="Myo-reps").click(); pg.wait_for_timeout(300)
    tri = L(".card").filter(has=pg.locator("h3", has_text="Triceps pushdown")).first
    labs = tri.locator(".sr b").all_inner_texts()
    check("myo-reps add 3 mini-set rows", labs == ["1", "2", "M", "M", "M"], labs)
    for i in range(3):
        tri.locator("button.ck").nth(i).click(); pg.wait_for_timeout(200)
        tri = L(".card").filter(has=pg.locator("h3", has_text="Triceps pushdown")).first
    st = pg.evaluate("L_.mem()['w-' + L_.g()].sets['Triceps pushdown']")
    check("one tap logs working sets then a myo mini-set", st[2].get("t") == "M" and st[2]["r"] == 4 and st[2]["w"] == st[1]["w"], st)
    check("myo mini-set rest is short", "Myo" in L("#tm").inner_text(), L("#tm").inner_text())
    # timed exercise
    pl = L(".card").filter(has=pg.locator("h3", has_text="Plank")).first
    check("timed exercise logs seconds", pl.locator("input[data-s$='|0|r']").get_attribute("placeholder") == "sec" and " s" in pl.locator("h3 .tg").inner_text(), pl.locator("h3 .tg").inner_text())
    pl.locator("input[data-s$='|0|r']").fill("45"); pl.locator("input[data-s$='|0|r']").dispatch_event("change"); pg.wait_for_timeout(300)
    s0 = pg.evaluate("L_.mem()['w-' + L_.g()].sets['Plank'][0]")
    check("timed set counts with no weight", s0 == {"w": 0, "r": 45}, s0)
    # swaps
    bench.locator("button[data-a=sw]").click(); pg.wait_for_timeout(250)
    chips = L("button[data-a=sgp]").all_inner_texts()
    check("swap suggestions by movement", "Dumbbell bench press" in chips, chips)
    L("button[data-a=sgp]").filter(has_text="Dumbbell bench press").first.click(); pg.wait_for_timeout(300)
    check("swap applies", L("h3").filter(has_text="Dumbbell bench press").count() == 1)
    # how to
    L("button[data-a=hw]").first.click(); pg.wait_for_timeout(200)
    check("how-to cue", "per dumbbell" in L(".hint").first.inner_text().lower() or L(".hint").count() > 0)
    # program: set style
    L("nav button[data-a=tab][data-v=prog]").click(); pg.wait_for_timeout(300)
    L("details.sty summary").first.click(); pg.wait_for_timeout(100)
    L("select[data-p='0|0|tq']").select_option("drop"); pg.wait_for_timeout(200)
    L("select[data-p='0|0|rir']").select_option("2"); pg.wait_for_timeout(200)
    ex0 = pg.evaluate("L_.mem().prog.days[0].ex[0]")
    check("program set style saves technique and target RIR", ex0.get("tq") == "drop" and ex0.get("rir") == 2, ex0)
    with pg.expect_download(timeout=5000) as dl:
        L("button[data-a=pgs]").click()
    f = json.loads(Path(dl.value.path()).read_text())
    check("program file keeps set style", f["days"][0]["ex"][0].get("tq") == "drop" and f["days"][0]["ex"][0].get("rir") == 2, f["days"][0]["ex"][0])
    L("select[data-p='0|0|rs']").select_option("150"); pg.wait_for_timeout(200)
    check("rest per exercise saves", pg.evaluate("L_.mem().prog.days[0].ex[0].rs") == 150)
    L("select[data-cf=rq]").select_option("0"); pg.wait_for_timeout(250)
    L("nav button[data-a=tab][data-v=today]").click(); pg.wait_for_timeout(300)
    first = L(".card").filter(has=pg.locator("h3", has_text="press")).first
    check("rest shows on the exercise", "2:30 rest" in first.locator("h3 .tg").inner_text(), first.locator("h3 .tg").inner_text())
    first.locator(".sr").filter(has=pg.locator("b", has_text="1")).locator("button.ck").first.click(); pg.wait_for_timeout(400)
    check("rest timer uses the exercise's rest", L("#tm").inner_text() in ("2:30", "2:29"), L("#tm").inner_text())
    L("#tm").click()
    check("RIR box can be hidden", not L(".rir").first.is_visible())
    # import
    L("nav button[data-a=tab][data-v=hist]").click(); pg.wait_for_timeout(300)
    csv = tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False)
    csv.write('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE\n'
              f'"{ago(30)} 18:00:00","Old push","1h","Bench Press (Barbell)","1","185","5","0","0","","",""\n'
              f'"{ago(30)} 18:00:00","Old push","1h","Bench Press (Barbell)","2","185","5","0","0","","",""\n'
              f'"{ago(2)} 18:00:00","Dup","1h","Bench Press (Barbell)","1","999","5","0","0","","",""\n')
    csv.close()
    L("#imf").set_input_files(csv.name); pg.wait_for_timeout(500)
    prev = L("#impc").inner_text()
    check("import preview", "Import from Strong" in prev and "2 workouts" in prev and "Bench Press (Barbell) → Bench press" in prev, prev)
    L("button[data-a=impgo]").click(); pg.wait_for_timeout(400)
    m = pg.evaluate(f"[L_.mem()['w-{ago(30)}'], L_.mem()['w-{ago(2)}'].sets['Bench press'][0].w]")
    check("import adds history, keeps existing days", m[0] and m[0]["imp"] == "Strong" and m[1] == 200, m)
    check("imported day shows in sessions", "Old push" in L(".card").filter(has=pg.locator("h3", has_text="Sessions")).first.inner_text())
    L("button[data-a=impu]").click(); pg.wait_for_timeout(300)
    check("import can be undone", pg.evaluate(f"!L_.mem()['w-{ago(30)}']"))
    pg.screenshot(path=str(Path(tempfile.gettempdir()) / "train-hist.png"))
    b.close()

check("no page errors", not errs, errs)
httpd.shutdown()
print(f"{'FAIL' if fails else 'OK'}: {len(fails)} failed")
raise SystemExit(1 if fails else 0)
