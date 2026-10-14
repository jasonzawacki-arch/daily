from playwright.sync_api import sync_playwright
import sys, os, datetime
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
td = datetime.date.today(); mem = {'cfg': {'custom': [{'w': 3, 'l': 'Sample peptide 250 mcg SubQ', 'tag': 'A'}]}}  # an injectable of the user's own
E = td - datetime.timedelta(days=30)
for i in range(60, 0, -1):
    d = td - datetime.timedelta(days=i)
    after = d >= E
    mem['d-' + str(d)] = {'t': 'L', 'c': {'i1': 1}, 'wt': round((203.0 if after else 206.0) + (i % 3) * .2, 1),
        'bp': {'am': [(116 if after else 124) + i % 4, 72]}, 'sl': round((7.0 if after else 6.0) + (i % 3) * .1, 1)}
mem['dh'] = {'r': [{'d': str(E), 'm': 'Sample peptide', 'f': '2.5 mg', 't': '5 mg', 'y': ''}, {'d': str(td - datetime.timedelta(days=5)), 'm': 'Sample capsule', 'f': '10 mg', 't': '5 mg', 'y': ''}]}
mem['labs'] = {'r': [{'d': str(E - datetime.timedelta(days=10)), 'm': 'AST', 'v': 58}, {'d': str(td - datetime.timedelta(days=3)), 'm': 'AST', 'v': 41}]}
MOCK = "localStorage.setItem('tour','1');localStorage.setItem('side','p');window.claude={use:async()=>null};"
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
    P = lambda s: pg.locator('#hp ' + s)
    P('button[data-a=tab][data-v=hist]').click(); pg.wait_for_timeout(500)
    C = P('.card:has(h3:text-is("Before and after a change"))')
    S('titration card', lambda: C.count())
    S('three panels', lambda: C.locator('svg.ch').count())
    S('baseline lines drawn', lambda: C.locator('line.av').count())
    S('table', lambda: C.locator('table').first.inner_text().replace('\n', ' | ').replace('\t', ' '))
    S('labs either side', lambda: C.locator('table').nth(1).inner_text().replace('\n', ' | ').replace('\t', ' '))
    S('chips', lambda: C.locator('.chips button').all_inner_texts())
    S('switch to recent change', lambda: (C.locator('.chips button').first.click(), pg.wait_for_timeout(300), C.locator('.chips button.on').inner_text()))
    S('recent change warns of thin data', lambda: C.locator('table').first.inner_text().replace('\n', ' | ').replace('\t', ' '))
    # injection sites
    P('button[data-a=tab][data-v=vitals]').click(); pg.wait_for_timeout(500)
    inj = P('.card:has(h3:text-is("Injection sites"))')
    S('injection card', lambda: inj.count())
    S('peptide sites abdomen only', lambda: [x for x in inj.locator('.inj').all()][0].inner_text().replace('\n', ' '))
    print('ERRORS', errs); b.close()
