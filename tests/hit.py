# HIT routine: progression rule, rest-pause tagging, timers, feeder sets, stats exclusion.
from playwright.sync_api import sync_playwright
import os, sys, datetime
path = 'file://' + os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
td = datetime.date.today(); prev = str(td - datetime.timedelta(days=6))
mem = {'w-' + prev: {'k': 0, 'dn': True, 'sets': {
    'Smith incline press': [{'w': 200, 'r': 8}, {'w': 200, 'r': 2, 't': 'R'}],
    'Cable crossover': [{'w': 50, 'r': 12}, {'w': 50, 'r': 3, 't': 'R'}]}}}
mem['w-' + str(td)] = {'k': 0}
MOCK = "localStorage.setItem('tour','1');window.claude={use:async()=>null};"
def S(n, f):
    try:
        r = f(); print('OK  ', n, '' if r is None else r)
    except Exception as e:
        print('FAIL', n, str(e).split('\n')[0][:170])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script(MOCK)
    pg.goto(path); pg.wait_for_timeout(1000)
    pg.evaluate("async(m)=>{for(const k in m){await IDB.set(k,m[k])}}", mem); pg.reload(); pg.wait_for_timeout(2200)
    pg.evaluate("window.gomod('l')"); pg.wait_for_timeout(500)
    L = lambda s: pg.locator('#hl ' + s)
    C = lambda n: L(f'.card:has(h3:has-text("{n}"))')
    S('heavy lift adds 5', lambda: 'Add 5 lb: next 205' in C('Smith incline press').inner_text() or C('Smith incline press').inner_text()[:300])
    S('isolation adds 2.5', lambda: 'Add 2.5 lb: next 52.5' in C('Cable crossover').inner_text() or C('Cable crossover').inner_text()[:300])
    S('last session shows 200x8+2', lambda: '200x8+2' in C('Smith incline press').inner_text())
    S('RP label', lambda: C('Smith incline press').locator('.sr b').all_inner_texts())
    S('feeder weights', lambda: (C('Smith incline press').locator('button[data-a=wu]').click(), pg.wait_for_timeout(250),
        [i.input_value() for i in C('Smith incline press').locator('input[data-s$="|w"]').all()][:3]))
    S('timer buttons', lambda: L('.rs').first.inner_text()[:40])
    S('volume ignores RP set count', lambda: (L('input[data-s="Smith incline press|3|w"]').fill('200'), L('input[data-s="Smith incline press|3|w"]').dispatch_event('change'),
        L('input[data-s="Smith incline press|3|r"]').fill('7'), L('input[data-s="Smith incline press|3|r"]').dispatch_event('change'),
        L('input[data-s="Smith incline press|4|w"]').fill('200'), L('input[data-s="Smith incline press|4|w"]').dispatch_event('change'),
        L('input[data-s="Smith incline press|4|r"]').fill('2'), L('input[data-s="Smith incline press|4|r"]').dispatch_event('change'), pg.wait_for_timeout(300), L('#vol').inner_text()))
print('ERRORS', errs)
