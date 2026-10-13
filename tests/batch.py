from playwright.sync_api import sync_playwright
import sys, os, re, datetime, random
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
src = open(os.path.join(os.path.dirname(path), '..', 'src', 'protocol.ts')).read()
block = src[src.index('const I = ['):]
block = block[:block.index('\n];')]
rows = [l for l in block.split('\n')[1:] if l.strip().startswith('[')]
PEP_ITEM = 'i%d' % next(i for i, l in enumerate(rows) if 'Sample peptide' in l)
random.seed(7); td = datetime.date.today(); mem = {}
last_mon = next(td - datetime.timedelta(days=n) for n in range(1, 8) if (td - datetime.timedelta(days=n)).weekday() == 0)
for i in range(16, 0, -1):
    d = td - datetime.timedelta(days=i)
    c = {('i%d' % k): 1 for k in range(0, random.randint(35, 60))}
    c.pop(PEP_ITEM, None) if d == last_mon else None
    mem['d-' + str(d)] = {'t': 'L', 'c': c, 'bp': {'am': [random.randint(112, 126), random.randint(68, 78)]},
        'wt': round(206 - i * 0.05, 1), 'sl': round(5.5 + random.random() * 2.5, 1)}
mem['w-' + str(td - datetime.timedelta(days=9))] = {'k': 0, 'sets': {'Bench press': [{'w': 185, 'r': 8}, {'w': 185, 'r': 7}]}}
mem['w-' + str(td - datetime.timedelta(days=2))] = {'k': 0, 'sets': {'Bench press': [{'w': 195, 'r': 8}, {'w': 195, 'r': 8}]}}
MOCK = """localStorage.setItem('tour','1');window.claude={use:async n=>n==='downloads'?{save:async o=>{window.__pdf=Array.from(o.data);window.__fn=o.filename}}:null};"""
def S(n, f):
    try:
        r = f(); print('OK  ', n, '' if r is None else r)
    except Exception as e:
        print('FAIL', n, str(e).split('\n')[0][:170])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script(MOCK)
    pg.goto('file://' + path); pg.wait_for_timeout(1000)
    pg.evaluate("async(m)=>{for(const k in m){await IDB.set(k,m[k])}}", mem); pg.reload(); pg.wait_for_timeout(2200)
    P = lambda s: pg.locator('#hp ' + s); Lf = lambda s: pg.locator('#hl ' + s)
    # --- dose planner
    S('Up next card on Today', lambda: P('.card:has(h3:text-is("Up next"))').inner_text().replace('\n', ' | ')[:300])
    S('sample peptide listed', lambda: 'Sample peptide' in P('.card:has(h3:text-is("Up next"))').inner_text())
    S('missed dose flagged', lambda: 'Missed' in P('.card:has(h3:text-is("Up next"))').inner_text())
    # --- dose log
    P('button[data-a=tab][data-v=more]').click(); pg.wait_for_timeout(300)
    P('button[data-a=sec][data-v=health]').click(); pg.wait_for_timeout(300)
    P('#dlm1').fill('Sample peptide'); P('#dlf').fill('2.5 mg'); P('#dlt').fill('5 mg'); P('#dly').fill('weekly consolidation'); P('#dld').fill(str(td - datetime.timedelta(days=5)))
    P('button[data-a=dla]').click(); pg.wait_for_timeout(400)
    S('dose change listed', lambda: 'Sample peptide: 2.5 mg to 5 mg' in P('.card:has(h3:text-is("Dose changes"))').inner_text())
    S('recheck added to journal', lambda: pg.evaluate("(window.P_.mem().chg||{r:[]}).r.length"))
    S('dose log stored', lambda: pg.evaluate("window.P_.mem().dh.r.length"))
    P('button[data-a=tab][data-v=today]').click(); pg.wait_for_timeout(400)
    S('Up next shows dose change', lambda: 'dose changed' in P('.card:has(h3:text-is("Up next"))').inner_text())
    P('button[data-a=tab][data-v=hist]').click(); pg.wait_for_timeout(400)
    S('trend chart has a change marker', lambda: P('.card:has(button[data-a=tr2]) line.mk').count())
    # --- weekly review
    S('weekly review card', lambda: P('.card:has(h3:text-is("Weekly review"))').inner_text().replace('\n', ' | ')[:420])
    S('window bars present', lambda: P('.wb').count())
    S('slipped list present', lambda: P('.rv').count())
    S('week-before toggle', lambda: (P('button[data-a=wro][data-v="1"]').click(), pg.wait_for_timeout(300), P('button[data-a=wro][data-v="1"]').get_attribute('class')))
    P('button[data-a=wro][data-v="0"]').click(); pg.wait_for_timeout(300)
    P('button[data-a=wpdf]').click(); pg.wait_for_timeout(500)
    data = pg.evaluate("window.__pdf"); fn = pg.evaluate("window.__fn")
    S('weekly pdf saved', lambda: (fn, len(data), bytes(data)[:5]))
    open('/tmp/weekly.pdf', 'wb').write(bytes(data))
    # --- lift validation + progress
    P('button[data-a=tab][data-v=sw]').click() if False else None
    pg.evaluate("window.gomod('l')"); pg.wait_for_timeout(600)
    inp = Lf('input[data-s$="|w"]').first
    inp.fill('2250'); inp.dispatch_event('change'); pg.wait_for_timeout(300)
    S('warn banner on 2250', lambda: Lf('.al').first.inner_text())
    S('2250 not saved yet', lambda: Lf('input[data-s$="|w"]').first.input_value() == '')
    Lf('button[data-a=lkeep]').click(); pg.wait_for_timeout(300)
    S('keep saves it', lambda: Lf('input[data-s$="|w"]').first.input_value())
    inp = Lf('input[data-s$="|w"]').first
    inp.fill('190'); inp.dispatch_event('change'); pg.wait_for_timeout(300)
    S('normal value no warning', lambda: Lf('.al').count() == 0 and Lf('input[data-s$="|w"]').first.input_value())
    inp = Lf('input[data-s$="|r"]').first
    inp.fill('120'); inp.dispatch_event('change'); pg.wait_for_timeout(300)
    S('reps 120 warns', lambda: Lf('.al').first.inner_text())
    Lf('button[data-a=lfix]').click(); pg.wait_for_timeout(300)
    Lf('button[data-a=tab][data-v=hist]').click(); pg.wait_for_timeout(400)
    S('lift progress card', lambda: Lf('.card:has(h3:text-is("Lift progress"))').inner_text().replace('\n', ' | ')[:200])
    S('open lift chart', lambda: (Lf('button[data-a=hx]').first.click(), pg.wait_for_timeout(300), Lf('.card:has(h3:text-is("Lift progress")) svg.ch').count()))
    S('volume by muscle', lambda: Lf('.card:has(h3:text-is("Weekly volume by muscle")) .mvs').count())
    print('ERRORS', errs); b.close()
