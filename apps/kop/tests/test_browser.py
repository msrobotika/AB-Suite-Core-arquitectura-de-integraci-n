# SPDX-License-Identifier: MIT
"""Authentic Chromium integration tests and reproducible screenshots."""
from pathlib import Path
import tempfile
import shutil
import unittest
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'AB-KOP-Studio-PORTABLE.html').read_text('utf-8')
OUT=ROOT/'docs/screenshots'

class BrowserTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  binary=shutil.which('chromium') or shutil.which('google-chrome')
  cls.browser=cls.pw.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':binary} if binary else {}))
  OUT.mkdir(parents=True,exist_ok=True)
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.pw.stop()
 def setUp(self):
  self.page=self.browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
  self.errors=[];self.requests=[]
  self.page.on('pageerror',lambda error:self.errors.append(str(error)))
  self.page.on('request',lambda req:self.requests.append(req.url))
  self.page.set_content(HTML,wait_until='load')
 def tearDown(self):
  self.assertEqual(self.errors,[],f'JavaScript errors {self.errors}')
  self.assertEqual(self.requests,[],f'Unexpected network {self.requests}')
  self.page.close()
 def test_init_offline_and_ladder_diagram(self):
  self.assertEqual(self.page.locator('.rung').count(),4)
  self.assertEqual(self.page.locator('.contact').count(),9)
  self.assertEqual(self.page.locator('#scan-label').inner_text(),'Ciclo 0')
  self.assertIn('MOTOR',self.page.locator('#outputs').inner_text())
 def test_motor_latch_timer_and_stop(self):
  self.page.locator('.input-item',has_text='START').click()
  for _ in range(3):self.page.locator('#step').click()
  self.assertIn('Ciclo 3',self.page.locator('#scan-label').inner_text())
  self.assertTrue(self.page.locator('.output.on',has_text='PILOTO_VERDE').count())
  self.page.screenshot(path=str(OUT/'kop-escritorio.png'),full_page=True,animations='disabled')
  self.page.locator('.input-item',has_text='START').click()
  self.page.locator('#step').click()
  self.assertTrue(self.page.locator('.output.on',has_text='MOTOR').count())
  self.page.locator('.input-item').nth(1).click()
  self.page.locator('#step').click()
  self.assertEqual(self.page.locator('.output.on',has_text='MOTOR').count(),0)
  self.assertEqual(self.page.locator('.output.on',has_text='PILOTO_VERDE').count(),0)
  self.page.screenshot(path=str(OUT/'kop-paro.png'),full_page=True,animations='disabled')
 def test_back_restores_inputs_and_scan(self):
  self.page.locator('.input-item',has_text='START').click()
  self.page.locator('#step').click()
  self.page.locator('.input-item',has_text='START').click()
  self.page.locator('#back').click()
  self.assertEqual(self.page.locator('#scan-label').inner_text(),'Ciclo 0')
  self.assertIn('ON',self.page.locator('.input-item',has_text='START').inner_text())
 def test_editor_add_branch_contact_edit_and_new_output(self):
  self.page.locator('#add-rung').click()
  self.assertEqual(self.page.locator('.rung').count(),5)
  self.assertEqual(self.page.locator('#edit-target').input_value(),'Q_R5')
  self.page.locator('#add-branch').click()
  self.assertEqual(self.page.locator('.rung.selected .branch').count(),2)
  self.page.locator('#add-contact').click()
  self.assertEqual(self.page.locator('.rung.selected .contact').count(),3)
  self.page.locator('#edit-name').fill('Control de aviso')
  self.page.locator('#inspector-form .primary').click()
  self.assertIn('Control de aviso',self.page.locator('.rung.selected').inner_text())
  self.page.screenshot(path=str(OUT/'kop-editor.png'),full_page=True,animations='disabled')
 def test_reject_invalid_duplicate_coil(self):
  self.page.locator('#add-rung').click()
  self.page.locator('#edit-target').fill('MOTOR')
  self.page.locator('#inspector-form .primary').click()
  self.assertIn('Edición rechazada',self.page.locator('#notice').inner_text())
  self.assertEqual(self.page.locator('#edit-target').input_value(),'MOTOR')
 def test_exports_json_svg_html_csv(self):
  with tempfile.TemporaryDirectory() as temp:
   for selector,ext in [('#export-json','.json'),('#export-svg','.svg'),('#export-report','.html'),('#export-csv','.csv')]:
    with self.page.expect_download() as dl:self.page.locator(selector).click()
    obj=dl.value
    self.assertTrue(obj.suggested_filename.endswith(ext),obj.suggested_filename)
    path=Path(temp)/obj.suggested_filename;obj.save_as(path);self.assertTrue(path.stat().st_size>50)
    if selector=='#export-report':self.assertIn('SOLO SIMULACIÓN',path.read_text('utf-8'))
 def test_safe_report_escapes_untrusted_description(self):
  self.page.locator('#description').fill('<script>alert(1)</script>')
  self.page.locator('#description').dispatch_event('change')
  with tempfile.TemporaryDirectory() as tmp:
   with self.page.expect_download() as dl:self.page.locator('#export-report').click()
   path=Path(tmp)/'out.html';dl.value.save_as(path)
   data=path.read_text('utf-8');self.assertNotIn('<script>alert(1)</script>',data)
   self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;',data)
 def test_mobile_no_horizontal_overflow(self):
  self.page.set_viewport_size({'width':390,'height':844})
  self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > window.innerWidth'))
  self.page.locator('.input-item',has_text='START').click()
  self.page.locator('#step').click()
  self.assertEqual(self.page.locator('#scan-label').inner_text(),'Ciclo 1')
  self.page.screenshot(path=str(OUT/'kop-movil.png'),full_page=True,animations='disabled')
 def test_diagnostics_and_real_live_networks(self):
  self.page.locator('.input-item',has_text='START').click()
  self.page.locator('#step').click()
  self.assertEqual(self.page.locator('.trace-row').count(),4)
  self.assertIn('CONDUCE',self.page.locator('.trace-row').first.inner_text())
  self.page.locator('.rung[data-id="R1"]').screenshot(path=str(OUT/'kop-enclavamiento.png'),animations='disabled')
 def test_reset_and_restore_example(self):
  self.page.locator('#add-rung').click();self.assertEqual(self.page.locator('.rung').count(),5)
  self.page.locator('#restore').click();self.assertEqual(self.page.locator('.rung').count(),4)
  self.page.locator('.input-item',has_text='START').click();self.page.locator('#step').click()
  self.page.locator('#reset').click();self.assertEqual(self.page.locator('#scan-label').inner_text(),'Ciclo 0')

if __name__=='__main__':unittest.main()
