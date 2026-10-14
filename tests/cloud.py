from playwright.sync_api import sync_playwright
import sys, os, json
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
MOCK = """
(()=>{const K='__mockdb';const L=()=>JSON.parse(localStorage.getItem(K)||'{}'),W=o=>localStorage.setItem(K,JSON.stringify(o));
const doc=p=>({get:async()=>{const v=L()[p];return{exists:v!==undefined,data:()=>v}},set:async d=>{const o=L();o[p]=JSON.parse(JSON.stringify(d));W(o)},delete:async()=>{const o=L();delete o[p];W(o)}});
const col=p=>({doc:id=>doc(p+'/'+id),get:async()=>({docs:[]})});
window.claude={use:async n=>n==='user'?{id:async()=>'u1'}:n==='db'?{collection:col}:null};})();
localStorage.setItem('tour','1');localStorage.setItem('side','p');
"""
def S(n, f):
    try:
        r = f(); print('OK  ', n, '' if r is None else r)
    except Exception as e:
        print('FAIL', n, str(e).split('\n')[0][:170])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script(MOCK)
    pg.goto('file://' + path); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator('#hp ' + s)
    def tab(t): P(f'button[data-a=tab][data-v={t}]').click(); pg.wait_for_timeout(350)
    def sec(n):
        b = P(f'button[data-a=sec][data-v={n}]')
        if b.get_attribute('aria-expanded') != 'true': b.click(); pg.wait_for_timeout(250)
    tab('vitals'); P('input[data-k=wt]').fill('204.2'); P('input[data-k=wt]').dispatch_event('change'); pg.wait_for_timeout(400)
    tab('more'); sec('reports')
    S('cloud card renders', lambda: P('button[data-a=cbk]').count())
    S('backup writes meta + chunk', lambda: (P('button[data-a=cbk]').click(), pg.wait_for_timeout(1200), sorted(json.loads(pg.evaluate("localStorage.getItem('__mockdb')")).keys())))
    S('status says backed up', lambda: P('p[role=status]').inner_text())
    tab('vitals'); P('input[data-k=wt]').fill('150'); P('input[data-k=wt]').dispatch_event('change'); pg.wait_for_timeout(400)
    tab('more'); sec('reports')
    S('restore asks to confirm', lambda: (P('button[data-a=crs]').click(), pg.wait_for_timeout(300), P('button[data-a=crs]').inner_text()))
    S('restore applies', lambda: (P('button[data-a=crs]').click(), pg.wait_for_timeout(1500), P('p[role=status]').inner_text()))
    tab('vitals')
    S('weight restored to 204.2', lambda: P('input[data-k=wt]').input_value())
    print('ERRORS', errs); b.close()
