from playwright.sync_api import sync_playwright
import sys, os, datetime
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
td = datetime.date.today()
def S(n, f):
    try:
        r = f(); print('OK  ', n, '' if r is None else r)
    except Exception as e:
        print('FAIL', n, str(e).split('\n')[0][:170])
errs = []
seed = "localStorage.setItem('tour','1');localStorage.setItem('side','p');"
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script(seed)
    pg.goto('file://' + path); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator('#hp ' + s)
    def tab(t): P(f'button[data-a=tab][data-v={t}]').click(); pg.wait_for_timeout(350)
    # More sections
    tab('more')
    S('4 sections, collapsed', lambda: (P('.sech').count(), P('.sec .card').count()))
    S('open health shows labs', lambda: (P('button[data-a=sec][data-v=health]').click(), pg.wait_for_timeout(250), P('.sec .card h3').all_inner_texts()[:3]))
    # validation: typed
    tab('vitals')
    S('typed weight 20.4 warns', lambda: (P('input[data-k=wt]').fill('20.4'), P('input[data-k=wt]').dispatch_event('change'), pg.wait_for_timeout(300), P('.al[role=alert]').inner_text()))
    S('not saved yet', lambda: P('input[data-k=wt]').input_value() == '')
    S('keep saves it', lambda: (P('button[data-a=wkeep]').click(), pg.wait_for_timeout(300), P('input[data-k=wt]').input_value()))
    S('dia >= sys warns', lambda: (P('input[data-k="bp.am.0"]').fill('118'), P('input[data-k="bp.am.0"]').dispatch_event('change'), P('input[data-k="bp.am.1"]').fill('130'), P('input[data-k="bp.am.1"]').dispatch_event('change'), pg.wait_for_timeout(300), P('.al[role=alert]').inner_text()))
    S('re-enter dismisses', lambda: (P('button[data-a=wfix]').click(), pg.wait_for_timeout(300), P('.al[role=alert]').count()))
    # voice warning
    S('dictated weight 20 flagged', lambda: (P('#qc-vitals').fill('weight 20'), P('#qc-vitals').press('Enter'), pg.wait_for_timeout(300), (P('.pill.warn').count(), P('.vp .vm').inner_text())))
    P('button[data-a=vcancel]').click(); pg.wait_for_timeout(200)
    # undo: add meal, remove, undo
    tab('fuel')
    S('add meal', lambda: (P('#qc-fuel').fill('ate eggs 300 calories'), P('#qc-fuel').press('Enter'), pg.wait_for_timeout(250), P('button[data-a=vsave]').click(), pg.wait_for_timeout(300), P('button[data-a=nx2]').count()))
    S('remove shows undo', lambda: (P('button[data-a=nx2]').first.click(), pg.wait_for_timeout(300), (P('button[data-a=nx2]').count(), P('#ut').is_visible())))
    S('undo restores', lambda: (P('#ut button').click(), pg.wait_for_timeout(300), P('button[data-a=nx2]').count()))
    # history
    tab('hist')
    S('find card present', lambda: P('#fq').count())
    S('range chips', lambda: P('button[data-a=tr2]').all_inner_texts())
    S('tap chart point shows value', lambda: (P('button[data-a=tr][data-v=Weight]').click(), pg.wait_for_timeout(250), P('circle.hit').count()))
    S('search finds meal', lambda: (P('#fq').fill('eggs'), P('#fq').press('Enter'), pg.wait_for_timeout(300), P('.card:has(#fq) .r').count()))
    S('open result goes to today', lambda: (P('.card:has(#fq) .r button').first.click(), pg.wait_for_timeout(300), P('.w').get_attribute('data-t')))
    # a11y
    tab('vitals')
    S('inputs labelled', lambda: pg.evaluate("[...document.getElementById('hp').shadowRoot.querySelectorAll('input[type=number],textarea')].filter(e=>!e.getAttribute('aria-label')).length"))
    S('nav current', lambda: P('nav button[aria-current=page]').count())
    # today focus + jump
    tab('today')
    S('jump button logic', lambda: (pg.evaluate("window.scrollTo(0,0)"), pg.wait_for_timeout(300), P('#jn').is_hidden()))
    print('ERRORS', errs); b.close()
