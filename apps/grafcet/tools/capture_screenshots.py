#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'AB-GRAFCET-Studio-PORTABLE.html').read_text(encoding='utf-8')
OUT=ROOT/'docs/screenshots'
OUT.mkdir(parents=True,exist_ok=True)

def capture():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(HTML,wait_until='domcontentloaded')
        assert page.locator('.stage').count()==4
        page.locator('.signal-row',has_text='marcha').click()
        page.locator('#step').click()
        assert page.locator('#active-label').inner_text()=='E1'
        page.locator('.signal-row',has_text='carga_terminada').click()
        page.locator('#step').click()
        assert page.locator('#active-label').inner_text()=='E2'
        page.screenshot(path=str(OUT/'grafcet-escritorio.png'),full_page=False,animations='disabled')
        page.screenshot(path=str(OUT/'grafcet-proyecto-completo.png'),full_page=True,animations='disabled')
        assert page.locator('.reason-row').count()==4
        page.locator('#decisions').screenshot(path=str(OUT/'grafcet-diagnostico.png'),animations='disabled')
        page.locator('.transition[data-id="T2"]').click()
        page.locator('.canvas-panel').screenshot(path=str(OUT/'grafcet-editor.png'),animations='disabled')
        mob=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
        mob.set_content(HTML,wait_until='domcontentloaded')
        mob.locator('.signal-row',has_text='marcha').click()
        mob.locator('#step').click()
        assert mob.locator('#active-label').inner_text()=='E1'
        assert not mob.evaluate('document.documentElement.scrollWidth > innerWidth')
        mob.screenshot(path=str(OUT/'grafcet-movil.png'),full_page=True,animations='disabled')
        assert not errors, errors
        browser.close()
    for p in OUT.glob('grafcet-*.png'):
        assert p.read_bytes().startswith(bytes((137,80,78,71,13,10,26,10)))
        print(p.name,p.stat().st_size)
if __name__=='__main__':capture()
