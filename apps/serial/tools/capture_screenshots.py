# SPDX-License-Identifier: MIT
# Copyright (c) 2026 MS ROBOTIKA
"""Browser screenshot E2E with the actual local Python simulator and frontend."""
from pathlib import Path
import http.client,json,os,re,subprocess,sys
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'screenshots'
OUT.mkdir(parents=True,exist_ok=True)

def main():
    p=subprocess.Popen([sys.executable,'-u','-m','ab_serial','--no-browser'],
        cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,
        bufsize=1,env={**os.environ,'PYTHONUNBUFFERED':'1'})
    try:
        title=p.stdout.readline().strip()
        url=p.stdout.readline().strip()
        if not re.fullmatch(r'http://127\.0\.0\.1:\d+/#token=[A-Za-z0-9_\-]+',url):
            raise RuntimeError(f'La URL local no es válida: {title} / {url}')
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
            page=browser.new_page(viewport={'width':1440,'height':900},
                                   device_scale_factor=1,accept_downloads=True)
            errors=[]
            page.on('pageerror',lambda err:errors.append(str(err)))
            # The browser may block navigation to localhost on restricted runners.
            # Use unaltered HTML/CSS and operational JS, forwarding each API call
            # to the actual Python server; no fabricated frame payloads or mock UI.
            def bridge(req):
                u=urlsplit(url)
                conn=http.client.HTTPConnection(u.hostname,u.port,timeout=5)
                conn.request(req['method'],req['path'],body=req.get('body'),headers=req['headers'])
                result=conn.getresponse()
                payload={'status':result.status,'raw':result.read().decode('utf-8')}
                conn.close()
                return payload
            page.expose_function('__real_http',bridge)
            js=(ROOT/'ab_serial/web/app.js').read_text(encoding='utf-8')
            js=js.replace("history.replaceState(null,'',location.pathname);","// Screenshot harness: no URL hash on about:blank")
            js=js.replace("const freshToken = fragment.get('token') || '';",
                          "const freshToken = "+json.dumps(urlsplit(url).fragment.split('token=',1)[1])+";")
            bootstrap="""
                Object.defineProperty(window,'sessionStorage',{value:{setItem(){},getItem(){return null}}});
                window.fetch=async (path,opts={}) => {
                  const r=await window.__real_http({path,method:opts.method||'GET',
                    body:opts.body||null,headers:opts.headers||{}});
                  return {ok:r.status>=200 && r.status<300,status:r.status,
                          json:async()=>JSON.parse(r.raw)};
                };
            """
            html=(ROOT/'ab_serial/web/index.html').read_text(encoding='utf-8')
            html=html.replace('<link rel="icon" href="/favicon.svg">','')
            html=html.replace('<link rel="stylesheet" href="/style.css">',
                 '<style>'+(ROOT/'ab_serial/web/style.css').read_text(encoding='utf-8')+'</style>')
            html=html.replace('<script src="/app.js" defer></script>','')
            html=html.replace('</body>','<script>'+bootstrap+'\n'+js+'</script></body>')
            page.set_content(html,wait_until='load')
            page.locator('#start').click()
            page.wait_for_function("() => +document.querySelector('#kpi-frames').textContent >= 6",
                                   timeout=18000)
            assert page.locator('#rows tr').count()>=6
            assert int(page.locator('#kpi-errors').inner_text())>=1
            assert page.locator('#mode-badge').inner_text().endswith('LABORATORIO ACTIVO')
            page.screenshot(path=str(OUT/'serial-escritorio.png'),full_page=True,animations='disabled')
            page.locator('#decoder').screenshot(path=str(OUT/'serial-decodificador.png'),animations='disabled')
            page.locator('#filter').select_option('errors')
            assert page.locator('#rows tr').count()>=1
            page.locator('#filter').select_option('all')
            with page.expect_download() as dl:
                page.locator('#export-csv').click()
            assert dl.value.suggested_filename.endswith('.csv')
            page.locator('#stop').click()
            page.wait_for_function("() => document.querySelector('#mode-badge').textContent.includes('EN ESPERA')",timeout=5000)
            assert not errors,errors
            mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
            mobile.expose_function('__real_http',bridge)
            mobile.set_content(html,wait_until='load')
            mobile.locator('#start').click()
            mobile.wait_for_function("() => document.querySelector('#mode-badge').textContent.includes('LABORATORIO ACTIVO')",timeout=8000)
            mobile.screenshot(path=str(OUT/'serial-movil.png'),full_page=True,animations='disabled')
            assert not mobile.evaluate('document.documentElement.scrollWidth>innerWidth')
            browser.close()
        for name in ('serial-escritorio.png','serial-decodificador.png','serial-movil.png'):
            f=OUT/name
            assert f.read_bytes().startswith(bytes((137,80,78,71,13,10,26,10)))
            print(f'{name}: {f.stat().st_size} bytes')
    finally:
        p.terminate()
        try:p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)
        p.stdout.close()

if __name__=='__main__':main()
