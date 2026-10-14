"""Gut tracking: timed symptoms with severity and the Bristol scale in Fuel, food tags remembered per meal, fiber
(including checked psyllium), the Gut patterns analysis (counts, baseline, minimum sample), alerts, the elimination
plan, the prescriber summary and CSV columns, and the Log gut shortcut on Today.
Run: node build.mjs && python3 tests/gut.py"""
import datetime, json, os, sys
from playwright.sync_api import sync_playwright

path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
td = datetime.date.today()
D = lambda n: str(td - datetime.timedelta(days=n))
fails, errs = [], []


def check(name, ok, detail=''):
    print(('OK  ' if ok else 'FAIL'), name, detail)
    if not ok:
        fails.append(name)


# 14 past days: a dairy breakfast at 08:00 on 8 of them, bloating at 10:30 after 7 of those;
# a plain lunch at 13:00 every day, followed by bloating (14:00 to 17:00) only twice; spicy dinner twice, both followed.
mem = {'cfg': {'mtag': {'yogurt bowl': ['Dairy'], 'chili': ['Spicy']}, 'mfb': {'lunch': 8}}}
for n in range(1, 15):
    meals, gut = [], [{'t': '07:30', 'k': 'b', 'b': 4}]
    if n <= 8:
        meals.append({'n': 'Yogurt bowl', 'k': 400, 'p': 30, 'c': 40, 'f': 10, 't': '08:00'})
        if n <= 7:
            gut.append({'t': '10:30', 'k': 's', 's': 'Bloating', 'v': 3})
    meals.append({'n': 'Lunch', 'k': 600, 'p': 40, 'c': 60, 'f': 15, 't': '13:00'})
    if n in (12, 13):
        gut.append({'t': '15:30', 'k': 's', 's': 'Bloating', 'v': 2})
    if n in (10, 11):
        meals.append({'n': 'Chili', 'k': 700, 'p': 40, 'c': 50, 'f': 20, 't': '18:00'})
        gut.append({'t': '20:30', 'k': 's', 's': 'Reflux', 'v': 3})
    mem['d-' + D(n)] = {'t': 'L', 'c': {}, 'nu': meals, 'g': gut, 'w': 60 if n > 7 else 40}
MOCK = """localStorage.setItem('tour','1');localStorage.setItem('side','p');window.__dl=[];
window.claude={use:async n=>n==='downloads'?{save:async o=>{window.__dl.push({f:o.filename,d:typeof o.data==='string'?o.data:''})}}:null};"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.add_init_script(MOCK)
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + path); pg.wait_for_timeout(1200)
    pg.evaluate("async(m)=>{for(const k in m){await IDB.set(k,m[k])}}", mem); pg.reload(); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator('#hp ' + s)
    text = lambda: pg.evaluate("document.getElementById('hp').shadowRoot.textContent")
    day = lambda: pg.evaluate("P_.mem()['d-' + P_.g()] || {}")

    # Today shortcut opens Fuel at the Gut card
    P('button[data-a=qgut]').click(); pg.wait_for_timeout(400)
    check('Log gut opens Fuel at the Gut card', P('#gutc').count() == 1 and P('button[data-a=tab][data-v=fuel]').get_attribute('aria-pressed') in ('true', None))

    # symptom with severity and a chosen time; Bristol
    P('#gtm').fill('13:05')
    P('button[data-a=gs][data-v=Bloating]').click(); pg.wait_for_timeout(200)
    P('button[data-a=gv][data-v="3"]').click(); pg.wait_for_timeout(300)
    check('symptom logged with severity and time', {'t': '13:05', 'k': 's', 's': 'Bloating', 'v': 3} in day().get('g', []), day().get('g'))
    P('button[data-a=gb][data-v="4"]').click(); pg.wait_for_timeout(300)
    check('Bristol logged', any(e.get('k') == 'b' and e.get('b') == 4 for e in day().get('g', [])))
    check('entries listed', '13:05 Bloating, 3 of 5' in text())

    # tags remembered per meal name, fiber from meals and checked psyllium
    P('#nn').fill('Yogurt bowl'); P('#nk').fill('400'); P('#np').fill('30'); P('button[data-a=nc2]').click(); pg.wait_for_timeout(300)
    check('a meal tagged before is tagged again', 'Dairy' in P('.card:has(h3:text-is("Logged"))').inner_text())
    P('button[data-a=mt]').first.click(); pg.wait_for_timeout(200)
    P('button[data-a=mtg][data-v="0|Onion and garlic"]').click(); pg.wait_for_timeout(300)
    check('FODMAP group shown on tags', 'Fructans' in P('.card:has(h3:text-is("Logged"))').inner_text())
    P('[data-mfb="0"]').fill('4'); P('[data-mfb="0"]').dispatch_event('change'); pg.wait_for_timeout(300)
    check('tags and fiber remembered for the meal name', pg.evaluate("P_.mem().cfg.mtag['yogurt bowl']") == ['Dairy', 'Onion and garlic'] and pg.evaluate("P_.mem().cfg.mfb['yogurt bowl']") == 4)
    fib = lambda: int(P('.card:has(h3:text-is("Logged")) p.sm').last.inner_text().split('Fiber today ')[1].split(' ')[0])
    f0 = fib()
    psy = pg.evaluate("(()=>{const r=P_.reg();const i=r.items.findIndex(x=>/psyllium/i.test(x[1]));return 'i'+i})()")
    pg.evaluate("id=>{const d=JSON.parse(JSON.stringify(P_.mem()['d-'+P_.g()]||{}));d.c=d.c||{};d.c[id]=1;P_.put('d-'+P_.g(),d);P_.r()}", psy); pg.wait_for_timeout(300)
    check('checked psyllium counts toward fiber', fib() == f0 + 5, (f0, fib()))

    # Gut patterns screen (from Fuel): the dairy pattern is found and flagged; small samples are not
    P('#gutc button[data-a=qg][data-v=gut]').click(); pg.wait_for_timeout(500)
    check('See patterns opens its own screen, Fuel stays selected', P('.card:has(h3:text-is("Gut patterns"))').count() == 1 and 'on' in (P('nav button[data-v=fuel]').get_attribute('class') or ''))
    card = P('.card:has(h3:text-is("Overview"))')
    t = card.inner_text()
    check('Gut patterns card shows counts', '7 of 8' in t and 'Dairy' in t, t[:400])
    rows = card.locator('tr').all_inner_texts()
    dairy = next((r for r in rows if r.startswith('Dairy')), '')
    check('dairy marked worth testing', 'worth testing' in dairy, dairy)
    pg.select_option('#hp [data-gwin]', '0-2'); pg.wait_for_timeout(300)
    check('changing the window changes the result', 'worth testing' not in next((r for r in card.locator('tr').all_inner_texts() if r.startswith('Dairy')), ''))
    pg.select_option('#hp [data-gwin]', '2-4'); pg.select_option('#hp [data-gsym]', 'Reflux'); pg.wait_for_timeout(300)
    spicy = next((r for r in card.locator('tr').all_inner_texts() if r.startswith('Spicy')), '')
    check('2 of 2 is not flagged (too few meals)', '2 of 2' in spicy and 'worth testing' not in spicy, spicy)
    check('symptom days compared with other days', 'Symptom days' in card.inner_text() and 'Water' in card.inner_text())

    # alerts: blood in stool, three watery days
    pg.evaluate("""()=>{const d=JSON.parse(JSON.stringify(P_.mem()['d-'+P_.g()]));d.g.push({t:'09:00',k:'s',s:'Blood in stool',v:3});P_.put('d-'+P_.g(),d);P_.r()}""")
    P('button[data-a=tab][data-v=today]').click(); pg.wait_for_timeout(400)
    check('blood in stool raises a prompt', 'Contact your provider promptly' in text())
    for n in (0, 1, 2):
        pg.evaluate("k=>{const d=JSON.parse(JSON.stringify(P_.mem()[k]||{t:'L',c:{}}));d.g=(d.g||[]).concat({t:'11:00',k:'b',b:7});P_.put(k,d)}", 'd-' + D(n))
    pg.evaluate('P_.r()'); pg.wait_for_timeout(300)
    check('three watery days raise a prompt', 'Watery stools three days running' in text())

    # History links to the screen
    P('button[data-a=tab][data-v=hist]').click(); pg.wait_for_timeout(400)
    check('History links to gut patterns', P('button[data-a=qg][data-v=gut]').count() == 1)
    P('button[data-a=qg][data-v=gut]').click(); pg.wait_for_timeout(400)

    # elimination plan, on the patterns screen; Fuel shows the status and flags avoided foods
    P('button[data-a=et][data-v=Dairy]').click(); pg.wait_for_timeout(200)
    P('button[data-a=es]').click(); pg.wait_for_timeout(300)
    t = text()
    check('elimination plan started', 'Day 1 of 28' in t and 'Avoiding Dairy' in t)
    check('baseline row shows the 14 days before', 'Before the plan (14 days)' in t)
    P('button[data-a=qg][data-v=fuel]').first.click(); pg.wait_for_timeout(400)
    t = text()
    check('Fuel shows the plan status', 'Elimination plan: day 1 of 28, avoiding Dairy' in t)
    check('meal with an avoided food is flagged', 'which your elimination plan avoids' in t)
    P('#gutc button[data-a=qg][data-v=gut]').click(); pg.wait_for_timeout(300)
    P('button[data-a=ee]').click(); pg.wait_for_timeout(300)
    check('plan can be ended', 'Avoiding Dairy' not in text())

    # prescriber summary and CSV
    P('button[data-a=tab][data-v=more]').click(); pg.wait_for_timeout(300)
    if not P('button[data-a=sum]').count():
        P('button[data-a=sec][data-v=reports]').click(); pg.wait_for_timeout(300)
    P('button[data-a=sum]').click(); pg.wait_for_timeout(300)
    summ = P('textarea[readonly]').first.input_value()
    check('prescriber summary has a gut line', 'Gut: ' in summ and 'Bloating x' in summ and 'Bristol average' in summ, [l for l in summ.splitlines() if l.startswith('Gut')])
    P('button[data-a=csv]').click(); pg.wait_for_timeout(500)
    csv = next((x['d'] for x in pg.evaluate('window.__dl') if x['f'].endswith('.csv')), '')
    head = csv.splitlines()[0] if csv else ''
    check('CSV has gut columns', all(c in head for c in ['gut_symptoms', 'bowel_movements', 'bristol_avg', 'fiber_g']), head)
    row = next((l for l in csv.splitlines() if l.startswith(D(3))), '')
    check('CSV gut values', row.split(',')[13:18][:3] == ['1', '3', '1'] or ',1,3,1,' in row, row)
    b.close()
check('no page errors', not errs, errs)
sys.exit(1 if fails else 0)
