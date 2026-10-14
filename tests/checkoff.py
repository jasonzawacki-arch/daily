from playwright.sync_api import sync_playwright
import sys, os
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
def S(n, f):
    try:
        r = f(); print('OK  ', n, '' if r is None else r)
    except Exception as e:
        print('FAIL', n, str(e).split('\n')[0][:170])
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','p')")
    pg.goto('file://' + path); pg.wait_for_timeout(1500)
    P = lambda s: pg.locator('#hp ' + s)
    prog = lambda: P('.pg b').inner_text()
    S('today bar present', lambda: P('#qc-today').count())
    S('baseline', prog)
    def cmd(t):
        P('#qc-today').fill(t); P('#qc-today').press('Enter'); pg.wait_for_timeout(300); return P('.vp .pill').all_inner_texts()
    S('window by name', lambda: cmd('morning meds done'))
    S('save checks the window', lambda: (P('button[data-a=vsave]').click(), pg.wait_for_timeout(400), prog()))
    S('window by number', lambda: cmd('window 1 done'))
    S('cancel', lambda: (P('button[data-a=vcancel]').click(), pg.wait_for_timeout(200), prog()))
    S('single item', lambda: cmd('took magnesium'))
    S('save item', lambda: (P('button[data-a=vsave]').click(), pg.wait_for_timeout(400), prog()))
    S('two windows', lambda: cmd('finished dinner and training'))
    S('nothing matched msg', lambda: (cmd('hello there'), P('p.vm').inner_text())[1])
    def open_a_window():
        # The current time window starts open, so which window a tap opens depends on the time of day: tap until one shows check-all.
        for i in range(P('button[data-a=o]').count()):
            if P('button[data-a=wall]').count():
                break
            P('button[data-a=o]').nth(i).click(); pg.wait_for_timeout(300)
        return P('button[data-a=wall]').count()
    S('check-all button on opened window', lambda: open_a_window() or (_ for _ in ()).throw(AssertionError('no window showed check-all')))
    S('check-all works', lambda: (P('button[data-a=wall]').first.click(), pg.wait_for_timeout(400), prog()))
    print('ERRORS', errs); b.close()
