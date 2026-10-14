from playwright.sync_api import sync_playwright
import sys, os, datetime, random
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
random.seed(5); td = datetime.date.today(); mem = {}
for i in range(40, 0, -1):
    d = td - datetime.timedelta(days=i)
    mem['d-' + str(d)] = {'t': 'L', 'c': {('i%d' % k): 1 for k in range(0, 20)}, 'wt': round(206 - i * 0.05 + random.random(), 1), 'nt': 'felt dizzy after training' if i == 9 else ''}
def S(n, f):
    try:
        r = f(); print('OK  ', n, '' if r is None else r)
    except Exception as e:
        print('FAIL', n, str(e).split('\n')[0][:170])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','p')")
    pg.goto('file://' + path); pg.wait_for_timeout(1000)
    pg.evaluate("async(m)=>{for(const k in m){await IDB.set(k,m[k])}}", mem); pg.reload(); pg.wait_for_timeout(2200)
    P = lambda s: pg.locator('#hp ' + s)
    S('auto-scrolled to now on load', lambda: pg.evaluate('window.scrollY') > 50)
    S('jump hidden while at now', lambda: P('#jn').is_hidden())
    S('jump shows after scrolling away', lambda: (pg.evaluate('window.scrollTo(0,0)'), pg.wait_for_timeout(400), P('#jn').is_visible()))
    S('jump scrolls back', lambda: (P('#jn').click(), pg.wait_for_timeout(900), pg.evaluate('window.scrollY') > 50))
    P('button[data-a=tab][data-v=hist]').click(); pg.wait_for_timeout(400)
    P('button[data-a=tr][data-v=Weight]').click(); pg.wait_for_timeout(300)
    S('hit targets exist (30d)', lambda: P('circle.hit').count())
    S('tap point shows value', lambda: (P('circle.hit').nth(3).dispatch_event('click'), pg.wait_for_timeout(300), P('.card:has(button[data-a=tr2]) p[role=status]').inner_text()))
    S('90 days has more points', lambda: (P('button[data-a=tr2][data-v="90"]').click(), pg.wait_for_timeout(300), P('circle.hit').count()))
    S('7 days has fewer', lambda: (P('button[data-a=tr2][data-v="7"]').click(), pg.wait_for_timeout(300), P('circle.hit').count()))
    S('search notes', lambda: (P('#fq').fill('dizzy'), P('#fq').press('Enter'), pg.wait_for_timeout(300), P('.card:has(#fq) .r').all_inner_texts()))
    print('ERRORS', errs); b.close()
