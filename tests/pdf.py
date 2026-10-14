from playwright.sync_api import sync_playwright
import sys, os, json, datetime, random
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
random.seed(3)
td = datetime.date.today(); mem = {}
for i in range(30, 0, -1):
    d = td - datetime.timedelta(days=i)
    mem['d-' + str(d)] = {'t': 'L' if i % 4 else 'R', 'c': {('i%d' % k): 1 for k in range(0, random.randint(30, 58))},
        'bp': {'am': [random.randint(112, 128), random.randint(68, 80)], 'pm': [random.randint(108, 124), random.randint(66, 78)]},
        'wt': round(206 - i * 0.06 + random.random(), 1), 'sl': round(6 + random.random() * 2, 1), 'aw': random.randint(0, 3),
        'sy': random.sample(['Dizziness', 'GI upset', 'Headache'], k=1) if i % 6 == 0 else []}
mem['labs'] = {'r': [{'d': '2026-08-01', 'm': 'AST', 'v': 52}, {'d': '2026-10-01', 'm': 'AST', 'v': 44}, {'d': '2026-10-01', 'm': 'ALT', 'v': 61}, {'d': '2026-10-01', 'm': 'ApoB', 'v': 72}, {'d': '2026-10-01', 'm': 'Hematocrit', 'v': 51.2}, {'d': '2026-10-01', 'm': 'PSA', 'v': 0.8}, {'d': '2026-10-01', 'm': 'LDL', 'v': 88}]}
MOCK = """localStorage.setItem('tour','1');localStorage.setItem('side','p');window.claude={use:async n=>n==='downloads'?{save:async o=>{window.__pdf=Array.from(o.data);window.__fn=o.filename}}:null};"""
seed = "".join("" for _ in [])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.add_init_script(MOCK)
    pg.goto('file://' + path); pg.wait_for_timeout(1200)
    pg.evaluate("async(m)=>{for(const k in m){await IDB.set(k,m[k])}}", mem); pg.reload(); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator('#hp ' + s)
    P('button[data-a=tab][data-v=more]').click(); pg.wait_for_timeout(300)
    sb = P('button[data-a=sec][data-v=reports]'); sb.click(); pg.wait_for_timeout(300)
    P('button[data-a=pdf]').click(); pg.wait_for_timeout(500)
    data = pg.evaluate("window.__pdf"); fn = pg.evaluate("window.__fn")
    open('/tmp/summary.pdf', 'wb').write(bytes(data)); print('file', fn, len(data), 'bytes', 'ERRORS', errs); b.close()
