# SPDX-License-Identifier: MIT
"""Pruebas de navegador y capturas verdaderas de AB-SCL Studio, sin peticiones externas."""
from pathlib import Path
import json
import shutil
import tempfile
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'AB-SCL-Studio-PORTABLE.html').read_text(encoding='utf-8')
OUT=ROOT/'docs/screenshots'
OUT.mkdir(parents=True,exist_ok=True)

class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw=sync_playwright().start()
        exe=shutil.which('google-chrome') or shutil.which('chromium')
        cls.browser=cls.pw.chromium.launch(headless=True,args=['--no-sandbox'],
            **({'executable_path':exe} if exe else {}))
    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
    def setUp(self):
        self.p=self.browser.new_page(viewport={'width':1500,'height':980},device_scale_factor=1,accept_downloads=True)
        self.errors=[]
        self.net=[]
        self.p.on('pageerror',lambda e:self.errors.append(str(e)))
        self.p.on('request',lambda r:self.net.append(r.url))
        self.p.set_content(HTML,wait_until='load')
    def tearDown(self):
        self.assertEqual(self.errors,[])
        self.assertEqual(self.net,[],'La edición portátil no debe acceder a la red')
        self.p.close()
    def test_initial_compilation_and_metrics(self):
        self.assertEqual(self.p.locator('#metric-status').inner_text(),'VERIFICADA')
        self.assertEqual(self.p.locator('#metric-cases').inner_text(),'16 casos')
        self.assertEqual(self.p.locator('.rung').count(),3)
        self.assertEqual(self.p.locator('.io-btn').count(),4)
    def test_live_simulation_and_screenshots(self):
        for name in ('START','SENSOR'):
            self.p.locator('.io-btn',has_text=name).click()
        self.assertEqual(self.p.locator('.coil.on').count(),2)
        self.assertEqual(self.p.locator('.output.on').count(),2)
        self.assertIn('coinciden',self.p.locator('#simulation-status').inner_text())
        self.p.screenshot(path=str(OUT/'scl-escritorio.png'),full_page=True,animations='disabled')
        self.p.locator('#converter').screenshot(path=str(OUT/'scl-conversor-kop.png'),animations='disabled')
    def test_invalid_st_rejected_without_rungs(self):
        src=self.p.locator('#source')
        src.fill(src.input_value().replace('MOTOR := START AND STOP_OK AND ESTOP_OK;',
             'MOTOR := MOTOR OR START;'))
        self.p.locator('#convert').click()
        self.assertEqual(self.p.locator('#metric-status').inner_text(),'RECHAZADA')
        self.assertIn('solo puede leer entradas',self.p.locator('#conversion-result').inner_text())
        self.assertEqual(self.p.locator('.rung').count(),0)
        self.p.screenshot(path=str(OUT/'scl-rechazo-seguro.png'),full_page=True,animations='disabled')
    def test_recovery_after_rejected_source(self):
        self.p.locator('#source').fill('NO_ES_ST')
        self.p.locator('#convert').click()
        self.assertEqual(self.p.locator('#metric-status').inner_text(),'RECHAZADA')
        self.p.locator('#reset-code').click()
        self.assertEqual(self.p.locator('#metric-status').inner_text(),'VERIFICADA')
    def test_zero_and_restore_inputs_without_touching_source(self):
        original=self.p.locator('#source').input_value()
        self.p.locator('.io-btn',has_text='START').click()
        self.p.locator('.io-btn',has_text='SENSOR').click()
        self.assertEqual(self.p.locator('.io-btn.on').count(),4)
        self.p.locator('#zero-inputs').click()
        self.assertEqual(self.p.locator('.io-btn.on').count(),0)
        self.assertEqual(self.p.locator('.rung').count(),3)
        self.assertEqual(self.p.locator('#source').input_value(),original)
        self.p.locator('#default-inputs').click()
        self.assertEqual(self.p.locator('.io-btn.on').count(),2)
        self.assertIn('valores declarados',self.p.locator('#notice').inner_text())

    def test_restore_example_can_undo_previous_code(self):
        source=self.p.locator('#source')
        initial=source.input_value()
        modified=initial.replace('// Demostración','// PROYECTO DEL USUARIO')
        source.fill(modified)
        self.p.locator('#reset-code').click()
        self.assertEqual(source.input_value(),initial)
        self.assertFalse(self.p.locator('#undo-demo').is_hidden())
        self.p.locator('#undo-demo').click()
        self.assertEqual(source.input_value(),modified)
        self.assertTrue(self.p.locator('#undo-demo').is_hidden())

    def test_kop_json_download(self):
        with self.p.expect_download() as item:
            self.p.locator('#export-kop').click()
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'kop.json'
            item.value.save_as(p)
            doc=json.loads(p.read_text('utf-8'))
            self.assertEqual(doc['schema'],1)
            self.assertEqual(len(doc['rungs']),3)
            self.assertEqual(doc['rungs'][0]['target'],'MOTOR')
    def test_svg_html_scl_exports(self):
        for button,extension in (('#export-source','.scl'),('#export-svg','.svg'),('#export-report','.html')):
            with self.p.expect_download() as item:
                self.p.locator(button).click()
            self.assertTrue(item.value.suggested_filename.endswith(extension))
    def test_report_html_escapes_comment(self):
        self.p.locator('#source').fill(self.p.locator('#source').input_value().replace(
           '// Demostración','(* <script>alert(1)</script> *)\n// Demostración'))
        self.p.locator('#convert').click()
        self.assertEqual(self.p.locator('#metric-status').inner_text(),'VERIFICADA')
        with self.p.expect_download() as item:
            self.p.locator('#export-report').click()
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'informe.html'
            item.value.save_as(p)
            data=p.read_text('utf-8')
            self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;',data)
            self.assertNotIn('<script>alert(1)</script>',data)
    def test_mobile_and_screenshot(self):
        self.p.set_viewport_size({'width':390,'height':844})
        self.assertFalse(self.p.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.p.locator('.io-btn',has_text='START').click()
        self.assertIn('ON',self.p.locator('.output.on').first.inner_text())
        self.p.screenshot(path=str(OUT/'scl-movil.png'),full_page=True,animations='disabled')
    def test_help_and_no_export_after_error(self):
        self.p.locator('#help').click()
        self.assertFalse(self.p.locator('#help-dialog').is_hidden())
        self.p.locator('#close-help').click()
        self.assertTrue(self.p.locator('#help-dialog').is_hidden())
        self.p.locator('#source').fill('BAD CODE')
        self.p.locator('#convert').click()
        self.p.locator('#export-kop').click()
        self.assertIn('corrige los errores',self.p.locator('#notice').inner_text())

if __name__=='__main__':unittest.main()
