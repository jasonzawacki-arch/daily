from playwright.sync_api import sync_playwright
import sys, os, json, datetime, time
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
td = datetime.date.today(); now = datetime.datetime.now()
off = int((now.replace(hour=20, minute=0, second=0, microsecond=0) - now).total_seconds() * 1000)
MOCK = """
(()=>{const K='__mockdb';const L=()=>JSON.parse(localStorage.getItem(K)||'{}'),W=o=>localStorage.setItem(K,JSON.stringify(o));
const doc=p=>({get:async()=>{const v=L()[p];return{exists:v!==undefined,data:()=>v}},set:async d=>{const o=L();o[p]=JSON.parse(JSON.stringify(d));W(o)},delete:async()=>{const o=L();delete o[p];W(o)}});
const col=p=>({doc:id=>doc(p+'/'+id),get:async()=>({docs:[]})});
window.claude={use:async n=>n==='user'?{id:async()=>'u1'}:n==='db'?{collection:col}:null};})();
localStorage.setItem('tour','1');
(()=>{const R=Date,off=%d;class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off)} static now(){return R.now()+off}}window.Date=D;})();
""" % off
mem = {}
for i in range(8, 0, -1):
    mem['d-' + str(td - datetime.timedelta(days=i))] = {'t': 'L', 'c': {'i1': 1}, 'wt': 205}
mem['labs'] = {'r': [{'d': str(td - datetime.timedelta(days=60)), 'm': 'AST', 'v': 52}, {'d': str(td - datetime.timedelta(days=10)), 'm': 'AST', 'v': 44}, {'d': str(td - datetime.timedelta(days=10)), 'm': 'ApoB', 'v': 72}]}
mem['dh'] = {'r': [{'d': str(td - datetime.timedelta(days=30)), 'm': 'Sample peptide', 'f': '2.5 mg', 't': '5 mg', 'y': ''}]}
prev = str(td - datetime.timedelta(days=3))
mem['w-' + prev] = {'k': 0, 'sets': {'Bench press': [{'w': 185, 'r': 8}, {'w': 185, 'r': 8}, {'w': 185, 'r': 8}, {'w': 185, 'r': 8}]}, 'xp': {'Bench press': 1}, 'xn': {'Bench press': 'left shoulder pinched'}}
mem['prog'] = {'days': [{'n': 'Push', 'ex': [{'n': 'Bench press', 's': 4, 'r': '6-8', 't': '', 'g': 'Chest'}]}, {'n': 'Pull', 'ex': [{'n': 'Barbell row', 's': 3, 'r': '8-10', 't': '', 'g': 'Back'}]}]}
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
    def tab(t): P(f'button[data-a=tab][data-v={t}]').click(); pg.wait_for_timeout(350)
    def sec(n):
        bt = P(f'button[data-a=sec][data-v={n}]')
        if bt.get_attribute('aria-expanded') != 'true': bt.click(); pg.wait_for_timeout(250)
    # evening
    S('evening card shows at 20:00', lambda: P('.card:has(h3:text-is("Evening wind-down"))').inner_text().replace('\n', ' | ')[:200])
    S('countdown text', lambda: P('#lo').inner_text())
    P('button[data-a=wev]').click(); pg.wait_for_timeout(400)
    S('evening card gone after check all', lambda: P('.card:has(h3:text-is("Evening wind-down"))').count() == 0)
    S('bedtime logged', lambda: pg.evaluate("window.P_.mem()['d-'+window.P_.g()].bt"))
    # labs
    tab('more'); sec('health')
    S('lab summary', lambda: P('.card:has(h3:text-is("Labs")) > p.sm').first.inner_text())
    S('lab sparks', lambda: P('.card:has(h3:text-is("Labs")) table svg.sp').count())
    S('lab context after tap', lambda: (P('td button[data-a=ls][data-v=AST]').click(), pg.wait_for_timeout(300), P('.card:has(h3:text-is("Labs"))').inner_text().split('Between')[1][:90]))
    # backup verify
    sec('reports')
    S('verify with no backup', lambda: (P('button[data-a=cvf]').click(), pg.wait_for_timeout(600), P('p[role=status]').inner_text()))
    P('button[data-a=cbk]').click(); pg.wait_for_timeout(1500)
    S('verify matches', lambda: (P('button[data-a=cvf]').click(), pg.wait_for_timeout(900), P('p[role=status]').inner_text()))
    S('lastVerify stored', lambda: pg.evaluate("window.P_.mem().cfg.lastVerify"))
    tab('vitals'); P('input[data-k=wt]').fill('199.5'); P('input[data-k=wt]').dispatch_event('change'); pg.wait_for_timeout(300)
    tab('more'); sec('reports')
    S('verify notes newer local data', lambda: (P('button[data-a=cvf]').click(), pg.wait_for_timeout(900), P('p[role=status]').inner_text()))
    # lift
    pg.evaluate("window.gomod('l')"); pg.wait_for_timeout(600)
    S('pain carried into today', lambda: Lf('.al').first.inner_text())
    S('last note shown', lambda: 'left shoulder pinched' in Lf('.card:has(h3:has-text("Bench press"))').inner_text())
    S('suggestion lowered', lambda: Lf('.hint:has-text("Pain was flagged")').first.inner_text()[:100])
    Lf('.card:has(h3:has-text("Bench press")) button[data-a=xnt]').click(); pg.wait_for_timeout(300)
    ta = Lf('textarea[data-xn]').first; ta.fill('felt better with neutral grip'); ta.dispatch_event('change'); pg.wait_for_timeout(200)
    Lf('.card:has(h3:has-text("Bench press")) button[data-a=xnt]').click(); pg.wait_for_timeout(300)
    S('note saved', lambda: 'neutral grip' in Lf('.card:has(h3:has-text("Bench press"))').inner_text())
    Lf('.card:has(h3:has-text("Bench press")) button[data-a=xp]').click(); pg.wait_for_timeout(300)
    S('pain flag toggles on', lambda: Lf('.card:has(h3:has-text("Bench press")) button[data-a=xp]').get_attribute('aria-pressed'))
    print('ERRORS', errs); b.close()
