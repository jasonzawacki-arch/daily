"""Contrast audit: samples the real background behind each text element (text hidden) and compares with its color.
Usage: python3 tests/contrast.py [file] [theme: light|dark|both]"""
from playwright.sync_api import sync_playwright
import sys, os, io, re, datetime, random
from PIL import Image
import numpy as np
path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/daily.html')
themes = ['light', 'dark'] if (len(sys.argv) < 3 or sys.argv[2] == 'both') else [sys.argv[2]]
td = datetime.date.today(); random.seed(1); mem = {}
for i in range(20, 0, -1):
    d = td - datetime.timedelta(days=i)
    mem['d-' + str(d)] = {'t': 'L', 'c': {('i%d' % k): 1 for k in range(0, 25)}, 'bp': {'am': [118, 74]}, 'wt': 205 + random.random(), 'sl': 7, 'nt': 'note', 'sy': ['Headache'], 'nu': [{'n': 'Eggs', 'k': 300, 'p': 30, 'c': 2, 'f': 20, 't': '07:00'}]}
mem['labs'] = {'r': [{'d': str(td), 'm': 'AST', 'v': 52}, {'d': str(td), 'm': 'ApoB', 'v': 70}]}
GATHER = """(sel)=>{const root=document.querySelector(sel).shadowRoot,out=[];const vh=innerHeight;
const fx=[...root.querySelectorAll('nav,header,#jn,#ut,#tm')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);const tw=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT);let n;while(n=tw.nextNode()){
 if(['STYLE','SCRIPT','SVG','PATH','OPTION'].includes(n.tagName.toUpperCase()))continue;
 let own='';n.childNodes.forEach(c=>{if(c.nodeType===3)own+=c.textContent});own=own.trim();
 const isField=/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)&&(n.value||'').length&&n.type!=='checkbox';
 if(!own&&!isField)continue;
 const r=n.getBoundingClientRect();if(r.width<4||r.height<4||r.bottom<0||r.top>vh)continue;
 if(!n.closest('nav,header,#jn,#ut,#tm')&&fx.some(f=>r.left<f.right&&r.right>f.left&&r.top<f.bottom&&r.bottom>f.top))continue;
 if(n.disabled)continue;
 if(scrollY>5&&n.closest('header'))continue;
 const cs=getComputedStyle(n);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
 let op=1,a=n;while(a&&a!==root){const c=getComputedStyle(a);op*=+c.opacity;a=a.parentElement||a.getRootNode().host}
 out.push({t:(own||n.value).slice(0,40),x:r.left,y:r.top,w:r.width,h:r.height,c:cs.color,fs:parseFloat(cs.fontSize),fw:+cs.fontWeight,op:op,cls:n.tagName.toLowerCase()+(n.className&&n.className.baseVal===undefined?'.'+String(n.className).trim().split(/\\s+/).join('.'):'')+(n.dataset&&n.dataset.a?'[a='+n.dataset.a+']':'')})}
return out}"""
def lum(c):
    c = np.asarray(c, dtype=float) / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]
def ratio(a, b):
    la, lb = lum(a), lum(b); hi, lo = max(la, lb), min(la, lb); return (hi + 0.05) / (lo + 0.05)
def parse(c):
    m = re.findall(r'[\d.]+', c); v = [float(x) for x in m]
    return v[:3], (v[3] if len(v) > 3 else 1.0)
res = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in themes:
        pg = b.new_context(viewport={'width': 390, 'height': 844}, color_scheme=theme).new_page()
        pg.add_init_script("localStorage.setItem('tour','1');localStorage.setItem('side','p');localStorage.setItem('fx','full')")
        pg.goto('file://' + path); pg.wait_for_timeout(800)
        pg.evaluate("async(m)=>{for(const k in m){await IDB.set(k,m[k])}}", mem); pg.reload(); pg.wait_for_timeout(1500)
        pg.evaluate(f"window.setTheme('{theme}')"); pg.wait_for_timeout(300)
        scenes = []
        def scan(name, sel):
            H = pg.evaluate("document.documentElement.scrollHeight"); y = 0
            while y < H:
                pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(250)
                els = pg.evaluate(GATHER, sel)
                pg.add_style_tag(content="*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}::placeholder{color:transparent!important}")
                pg.wait_for_timeout(120)
                img = np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
                pg.evaluate("document.querySelectorAll('style:last-of-type').forEach(s=>{if(s.textContent.startsWith('*{color:transparent'))s.remove()})")
                # shadow DOM styles aren't affected by document styles; inject into shadow root instead
                for e in els:
                    x0, y0, x1, y1 = int(e['x']) + 1, int(max(e['y'], 0)) + 1, int(e['x'] + e['w']) - 1, int(min(e['y'] + e['h'], 844)) - 1
                    if x1 <= x0 or y1 <= y0: continue
                    bg = img[y0:y1, max(x0, 0):min(x1, 390)].reshape(-1, 3)
                    if not len(bg): continue
                    bgc = np.median(bg, axis=0)
                    rgb, al = parse(e['c']); al *= e['op']
                    fg = [al * rgb[i] + (1 - al) * bgc[i] for i in range(3)]
                    r = ratio(fg, bgc)
                    big = e['fs'] >= 24 or (e['fs'] >= 18.66 and e['fw'] >= 700)
                    need = 3.0 if big else 4.5
                    if r < need: res.setdefault(theme, {}).setdefault((name, e['cls']), []).append((round(r, 2), e['t'], tuple(int(v) for v in bgc), e['c']))
                y += 600
        # inject transparent-text style INTO shadow roots (document styles do not pierce)
        INJ = "(()=>{for(const id of ['hp','hl']){const r=document.getElementById(id).shadowRoot;let s=r.getElementById('__t');if(!s){s=document.createElement('style');s.id='__t';s.textContent='*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}::placeholder{color:transparent!important}';r.appendChild(s)}s.disabled=true}})()"
        pg.evaluate(INJ)
        def scan2(name, sel):
            H = pg.evaluate("document.documentElement.scrollHeight"); y = 0
            while y < H:
                pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(250)
                els = pg.evaluate(GATHER, sel)
                pg.evaluate("for(const id of ['hp','hl'])document.getElementById(id).shadowRoot.getElementById('__t').disabled=false"); pg.wait_for_timeout(120)
                img = np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
                pg.evaluate("for(const id of ['hp','hl'])document.getElementById(id).shadowRoot.getElementById('__t').disabled=true")
                for e in els:
                    x0, x1 = max(int(e['x']) + 1, 0), min(int(e['x'] + e['w']) - 1, 390)
                    y0, y1 = int(max(e['y'], 0)) + 1, int(min(e['y'] + e['h'], 844)) - 1
                    if x1 <= x0 or y1 <= y0: continue
                    bgc = np.median(img[y0:y1, x0:x1].reshape(-1, 3), axis=0)
                    rgb, al = parse(e['c']); al *= e['op']
                    fg = [al * rgb[i] + (1 - al) * bgc[i] for i in range(3)]
                    r = ratio(fg, bgc); big = e['fs'] >= 24 or (e['fs'] >= 18.66 and e['fw'] >= 700)
                    if r < (3.0 if big else 4.5): res.setdefault(theme, {}).setdefault((name, e['cls']), []).append((round(r, 2), e['t'], tuple(int(v) for v in bgc), e['c']))
                y += 600
        P = lambda s: pg.locator('#hp ' + s)
        for t in ['today', 'vitals', 'fuel', 'hist']:
            P(f'button[data-a=tab][data-v={t}]').click(); pg.wait_for_timeout(500); scan2(t, '#hp')
        P('button[data-a=tab][data-v=more]').click(); pg.wait_for_timeout(400)
        for s in ['health', 'supply', 'reports', 'settings']:
            P(f'button[data-a=sec][data-v={s}]').click(); pg.wait_for_timeout(200)
        scan2('more', '#hp')
        P('button[data-a=tab][data-v=sw]').click(); pg.wait_for_timeout(600)
        L = lambda s: pg.locator('#hl ' + s)
        for t in ['today', 'prog', 'hist']:
            L(f'button[data-a=tab][data-v={t}]').click(); pg.wait_for_timeout(500); scan2('lift-' + t, '#hl')
    b.close()
tot = 0
for th, d in res.items():
    print('=====', th, 'offender groups:', len(d))
    for (sc, cls), v in sorted(d.items(), key=lambda kv: min(x[0] for x in kv[1])):
        tot += len(v); print(f'  {min(x[0] for x in v):>5}  x{len(v):<3} {sc:<10} {cls[:60]:<60} e.g. "{v[0][1]}" bg={v[0][2]} fg={v[0][3]}')
print('TOTAL offenders', tot)
