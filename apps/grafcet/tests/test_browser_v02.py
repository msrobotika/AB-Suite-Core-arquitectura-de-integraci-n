# SPDX-License-Identifier: MIT
"""Pruebas reales en Chromium para las mejoras de v0.2, sin conexión a PLC."""
from pathlib import Path
import shutil
import tempfile
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]

class V02BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw=sync_playwright().start()
        binary=shutil.which('chromium') or shutil.which('google-chrome')
        cls.browser=cls.pw.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':binary} if binary else {}))
        cls.source=(ROOT/'AB-GRAFCET-Studio-PORTABLE.html').read_text(encoding='utf-8')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop()

    def setUp(self):
        self.page=self.browser.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
        self.errors=[];self.requests=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.on('request',lambda r:self.requests.append(r.url))
        self.page.set_content(self.source,wait_until='domcontentloaded')

    def tearDown(self):
        self.assertEqual(self.errors,[]);self.assertEqual(self.requests,[])
        self.page.close()

    def test_dynamic_diagnostics(self):
        self.assertEqual(self.page.locator('.reason-row').count(),4)
        self.assertIn('CONDICIÓN FALSA',self.page.locator('.reason-row').first.inner_text())
        self.assertIn('FALTAN: E1',self.page.locator('.reason-row').nth(1).inner_text())
        self.page.locator('.signal-row',has_text='marcha').click()
        self.assertIn('LISTA',self.page.locator('.reason-row').first.inner_text())

    def test_undo_redo(self):
        self.page.locator('#add-stage').click()
        self.assertEqual(self.page.locator('.stage').count(),5)
        self.page.locator('#undo-edit').click()
        self.assertEqual(self.page.locator('.stage').count(),4)
        self.page.locator('#redo-edit').click()
        self.assertEqual(self.page.locator('.stage').count(),5)

    def test_step_back(self):
        self.page.locator('.signal-row',has_text='marcha').click()
        self.page.locator('#step').click()
        self.assertEqual(self.page.locator('#active-label').inner_text(),'E1')
        self.page.locator('.signal-row',has_text='carga_terminada').click()
        self.page.locator('#step').click()
        self.assertEqual(self.page.locator('#active-label').inner_text(),'E2')
        self.page.locator('#back').click()
        self.assertEqual(self.page.locator('#active-label').inner_text(),'E1')
        self.page.locator('#back').click()
        self.assertEqual(self.page.locator('#active-label').inner_text(),'E0')

    def test_printable_html_report_escapes_user_text(self):
        self.page.locator('#project-name').fill('<script>Alarma</script>')
        self.page.locator('#project-name').dispatch_event('change')
        with tempfile.TemporaryDirectory() as tmp:
            with self.page.expect_download() as result:self.page.locator('#export-report').click()
            path=Path(tmp)/'informe.html';result.value.save_as(path)
            html=path.read_text(encoding='utf-8')
            self.assertIn('&lt;script&gt;Alarma&lt;/script&gt;',html)
            self.assertNotIn('<script>Alarma</script>',html)
            self.assertIn('RESISTENCIA_SELLO',html)
            self.assertIn('SOLO ESPECIFICACIÓN',html)

    def test_mobile_diagnostics(self):
        self.page.set_viewport_size({'width':390,'height':844})
        self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.assertEqual(self.page.locator('.reason-row').count(),4)
